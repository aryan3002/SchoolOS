"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkywardClient = void 0;
const tslib_1 = require("tslib");
const axios_1 = tslib_1.__importDefault(require("axios"));
const bottleneck_1 = tslib_1.__importDefault(require("bottleneck"));
const types_1 = require("../../../types");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * HTTP client for Skyward REST API.
 * Supports OAuth2, API key, and basic auth configurations.
 */
class SkywardClient {
    credentials;
    logger;
    axiosInstance;
    limiter;
    retryOptions;
    accessToken;
    tokenExpiresAt;
    failureCount = 0;
    breakerOpenUntil;
    constructor(credentials, logger, retryOptions) {
        this.credentials = credentials;
        this.logger = logger;
        this.retryOptions = { ...types_1.defaultRetryOptions, ...(retryOptions ?? {}) };
        this.axiosInstance = axios_1.default.create({
            baseURL: credentials.baseUrl.replace(/\/$/, ''),
            timeout: 30_000,
        });
        this.limiter = new bottleneck_1.default({
            reservoir: 90,
            reservoirRefreshAmount: 90,
            reservoirRefreshInterval: 60_000,
            maxConcurrent: 5,
        });
    }
    async authenticate() {
        if (this.credentials.authType === 'oauth2') {
            await this.refreshToken(true);
        }
        // Basic/API key auth does not need token fetch
        return {
            status: 'connected',
            vendor: 'skyward',
            expiresAt: this.tokenExpiresAt
                ? new Date(this.tokenExpiresAt)
                : undefined,
        };
    }
    async getStudent(studentId) {
        return this.request({
            method: 'GET',
            url: `/api/v1/students/${encodeURIComponent(studentId)}`,
        });
    }
    async listStudents(schoolId, options) {
        const pageSize = options?.pageSize ?? 200;
        const page = options?.pageToken ? Number(options.pageToken) : 1;
        const params = {
            schoolId,
            page,
            pageSize,
        };
        if (options?.updatedAfter) {
            params['updatedAfter'] = options.updatedAfter.toISOString();
        }
        const response = await this.request({
            method: 'GET',
            url: '/api/v1/students',
            params,
        });
        return {
            items: response?.data ?? [],
            nextPageToken: response?.nextPage !== undefined
                ? String(response.nextPage)
                : (response?.data?.length ?? 0) === pageSize
                    ? String(page + 1)
                    : undefined,
            total: response?.total,
        };
    }
    async getGuardians(studentId) {
        const response = await this.request({
            method: 'GET',
            url: `/api/v1/students/${encodeURIComponent(studentId)}/guardians`,
        });
        return response?.data ?? [];
    }
    async getContacts(studentId) {
        const response = await this.request({
            method: 'GET',
            url: `/api/v1/students/${encodeURIComponent(studentId)}/contacts`,
        });
        return response?.data ?? [];
    }
    async getEnrollment(studentId) {
        return this.request({
            method: 'GET',
            url: `/api/v1/students/${encodeURIComponent(studentId)}/enrollment`,
        });
    }
    async getSchedule(studentId, termId) {
        const response = await this.request({
            method: 'GET',
            url: `/api/v1/students/${encodeURIComponent(studentId)}/schedule`,
            params: termId ? { termId } : undefined,
        });
        return response?.data ?? [];
    }
    async getGrades(studentId, termId) {
        const response = await this.request({
            method: 'GET',
            url: `/api/v1/students/${encodeURIComponent(studentId)}/grades`,
            params: termId ? { termId } : undefined,
        });
        return response?.data ?? [];
    }
    async getAttendance(studentId, dateRange) {
        const response = await this.request({
            method: 'GET',
            url: `/api/v1/students/${encodeURIComponent(studentId)}/attendance`,
            params: {
                startDate: dateRange.start.toISOString(),
                endDate: dateRange.end.toISOString(),
            },
        });
        return response?.data ?? [];
    }
    async getSectionStudents(sectionId) {
        const response = await this.request({
            method: 'GET',
            url: `/api/v1/sections/${encodeURIComponent(sectionId)}/students`,
        });
        return response?.data ?? [];
    }
    async getRoster(teacherId, termId) {
        return this.request({
            method: 'GET',
            url: `/api/v1/teachers/${encodeURIComponent(teacherId)}/roster`,
            params: termId ? { termId } : undefined,
        });
    }
    async getChanges(lastSyncTime, entityTypes) {
        const response = await this.request({
            method: 'GET',
            url: '/api/v1/changes',
            params: {
                since: lastSyncTime.toISOString(),
                entities: entityTypes?.join(','),
            },
        });
        return response?.data ?? [];
    }
    async listCampuses() {
        const response = await this.request({
            method: 'GET',
            url: '/api/v1/campuses',
        });
        return (response?.data ?? []).map((campus) => ({
            id: String(campus.id ?? campus.campusId ?? ''),
            name: campus.name,
        }));
    }
    async request(config, attempt = 0) {
        if (this.breakerOpenUntil && Date.now() < this.breakerOpenUntil) {
            throw new types_1.IntegrationError('Skyward circuit breaker open', 'skyward', 503);
        }
        return this.limiter.schedule(async () => {
            try {
                const response = await this.axiosInstance.request({
                    ...config,
                    headers: {
                        Accept: 'application/json',
                        ...(await this.buildAuthHeaders()),
                        ...(config.headers ?? {}),
                    },
                });
                this.logSuccess(response, config.url ?? '');
                this.failureCount = 0;
                this.breakerOpenUntil = undefined;
                return response.data;
            }
            catch (err) {
                const error = err;
                if (this.shouldRetry(error) && attempt < this.retryOptions.retries) {
                    const wait = this.computeBackoff(attempt);
                    await sleep(wait);
                    return this.request(config, attempt + 1);
                }
                this.failureCount += 1;
                if (this.failureCount >= 3) {
                    this.breakerOpenUntil = Date.now() + 30_000;
                    this.logger.warn('Skyward circuit breaker opened', {
                        vendor: 'skyward',
                        reopenAt: new Date(this.breakerOpenUntil),
                    });
                }
                this.logger.error('Skyward request failed', {
                    vendor: 'skyward',
                    status: error.response?.status,
                    url: config.url,
                    message: error.message,
                });
                throw new types_1.IntegrationError(error.message, 'skyward', error.response?.status, error.response?.data);
            }
        });
    }
    async buildAuthHeaders() {
        if (this.credentials.authType === 'api_key') {
            return { 'X-API-Key': this.credentials.clientSecret };
        }
        if (this.credentials.authType === 'basic') {
            const basic = Buffer.from(`${this.credentials.clientId}:${this.credentials.clientSecret}`).toString('base64');
            return { Authorization: `Basic ${basic}` };
        }
        const token = await this.refreshToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }
    async refreshToken(force = false) {
        if (this.credentials.authType !== 'oauth2') {
            return undefined;
        }
        const expired = force ||
            !this.accessToken ||
            !this.tokenExpiresAt ||
            Date.now() > this.tokenExpiresAt - 60_000;
        if (!expired) {
            return this.accessToken;
        }
        try {
            const response = await this.axiosInstance.post('/oauth2/token', new URLSearchParams({
                grant_type: 'client_credentials',
                client_id: this.credentials.clientId,
                client_secret: this.credentials.clientSecret,
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            this.accessToken = response.data.access_token;
            const expiresIn = response.data.expires_in ?? 900;
            this.tokenExpiresAt = Date.now() + expiresIn * 1000;
            this.logger.info('Skyward token refreshed', {
                vendor: 'skyward',
                expiresIn,
            });
            return this.accessToken;
        }
        catch (error) {
            const axiosError = error;
            this.logger.error('Skyward token refresh failed', {
                status: axiosError.response?.status,
                message: axiosError.message,
            });
            throw new types_1.IntegrationError('Failed to refresh Skyward token', 'skyward', axiosError.response?.status, axiosError.response?.data);
        }
    }
    logSuccess(response, url) {
        this.logger.debug('Skyward request completed', {
            vendor: 'skyward',
            url,
            status: response.status,
        });
    }
    shouldRetry(error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
            return true;
        const status = error.response?.status;
        return (!status ||
            this.retryOptions.retryableStatusCodes.includes(status) ||
            status === 401);
    }
    computeBackoff(attempt) {
        return Math.min(this.retryOptions.minTimeoutMs *
            Math.pow(this.retryOptions.factor, attempt), this.retryOptions.maxTimeoutMs);
    }
}
exports.SkywardClient = SkywardClient;
//# sourceMappingURL=skyward.client.js.map