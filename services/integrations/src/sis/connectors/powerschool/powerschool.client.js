"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PowerSchoolClient = void 0;
const tslib_1 = require("tslib");
const axios_1 = tslib_1.__importDefault(require("axios"));
const bottleneck_1 = tslib_1.__importDefault(require("bottleneck"));
const types_1 = require("../../../types");
const RETRY_AFTER_HEADER = 'retry-after';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Low-level HTTP client for PowerSchool REST API.
 * Handles OAuth, rate limiting, retries, and structured logging.
 */
class PowerSchoolClient {
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
        // Token bucket aligned to PowerSchool's 120 req/min limit.
        this.limiter = new bottleneck_1.default({
            reservoir: 120,
            reservoirRefreshAmount: 120,
            reservoirRefreshInterval: 60_000,
            maxConcurrent: 5,
        });
    }
    async authenticate() {
        await this.refreshToken(true);
        return {
            status: this.accessToken ? 'connected' : 'failed',
            vendor: 'powerschool',
            expiresAt: this.tokenExpiresAt
                ? new Date(this.tokenExpiresAt)
                : undefined,
        };
    }
    async getStudent(studentId) {
        return this.request({
            method: 'GET',
            url: `/ws/v1/student/${encodeURIComponent(studentId)}`,
        });
    }
    async listStudents(schoolId, options) {
        const pageSize = options?.pageSize ?? 200;
        const page = options?.pageToken ? Number(options.pageToken) : 0;
        const params = {
            pagesize: pageSize,
            page,
        };
        if (options?.updatedAfter) {
            params['updated_after'] = options.updatedAfter.toISOString();
        }
        const response = await this.request({
            method: 'GET',
            url: `/ws/v1/school/${encodeURIComponent(schoolId)}/students`,
            params,
        });
        const students = response?.students?.student ??
            response?.students ??
            response?.student ??
            [];
        const nextPageToken = response?.nextPage !== undefined
            ? String(response.nextPage)
            : students.length === pageSize
                ? String(page + 1)
                : undefined;
        return {
            items: students,
            nextPageToken,
            total: response?.total,
        };
    }
    async getGuardians(studentId) {
        const response = await this.request({
            method: 'GET',
            url: `/ws/v1/student/${encodeURIComponent(studentId)}/contacts`,
        });
        return response?.contacts?.contact ?? [];
    }
    async getContacts(studentId) {
        const response = await this.request({
            method: 'GET',
            url: `/ws/v1/student/${encodeURIComponent(studentId)}/emergency_contacts`,
        });
        return response?.contacts?.contact ?? [];
    }
    async getEnrollment(studentId) {
        return this.request({
            method: 'GET',
            url: `/ws/v1/student/${encodeURIComponent(studentId)}/enrollments`,
        });
    }
    async getSchedule(studentId, termId) {
        const params = termId ? { termid: termId } : undefined;
        const response = await this.request({
            method: 'GET',
            url: `/ws/v1/student/${encodeURIComponent(studentId)}/sections`,
            params,
        });
        return response?.sections?.section ?? [];
    }
    async getGrades(studentId, termId) {
        const params = termId ? { termid: termId } : undefined;
        const response = await this.request({
            method: 'GET',
            url: `/ws/v1/student/${encodeURIComponent(studentId)}/grades`,
            params,
        });
        return response?.grades?.grade ?? [];
    }
    async getAttendance(studentId, dateRange) {
        const response = await this.request({
            method: 'GET',
            url: `/ws/v1/student/${encodeURIComponent(studentId)}/attendance`,
            params: {
                start_date: dateRange.start.toISOString().split('T')[0],
                end_date: dateRange.end.toISOString().split('T')[0],
            },
        });
        return response?.attendance?.att_code ?? [];
    }
    async getAssignments(studentId) {
        const response = await this.request({
            method: 'GET',
            url: `/ws/v1/student/${encodeURIComponent(studentId)}/assignments`,
        });
        return response?.assignments?.assignment ?? [];
    }
    async getSectionStudents(sectionId) {
        const response = await this.request({
            method: 'GET',
            url: `/ws/v1/section/${encodeURIComponent(sectionId)}/students`,
        });
        return response?.students?.student ?? [];
    }
    async getRoster(teacherId, termId) {
        const params = termId ? { termid: termId } : undefined;
        return this.request({
            method: 'GET',
            url: `/ws/v1/teacher/${encodeURIComponent(teacherId)}/roster`,
            params,
        });
    }
    async getChanges(lastSyncTime, entityTypes) {
        const response = await this.request({
            method: 'GET',
            url: `/ws/v1/changes`,
            params: {
                since: lastSyncTime.toISOString(),
                entities: entityTypes?.join(','),
            },
        });
        return response?.changes?.change ?? [];
    }
    async listSchools() {
        const response = await this.request({
            method: 'GET',
            url: '/ws/v1/district/schools',
        });
        const schools = response?.schools?.school ?? [];
        return Array.isArray(schools) ? schools : [];
    }
    async request(config, attempt = 0) {
        if (this.breakerOpenUntil && Date.now() < this.breakerOpenUntil) {
            throw new types_1.IntegrationError('PowerSchool circuit breaker open', 'powerschool', 503);
        }
        return this.limiter.schedule(async () => {
            const start = Date.now();
            try {
                const token = await this.refreshToken();
                const response = await this.axiosInstance.request({
                    ...config,
                    headers: {
                        Accept: 'application/json',
                        ...(config.headers ?? {}),
                        Authorization: this.credentials.authType === 'oauth2' && token
                            ? `Bearer ${token}`
                            : config.headers?.Authorization,
                    },
                });
                this.logSuccess(response, start, config.url ?? '');
                this.failureCount = 0;
                this.breakerOpenUntil = undefined;
                return response.data;
            }
            catch (error) {
                const axiosError = error;
                const status = axiosError.response?.status;
                if (status === 401 && attempt === 0) {
                    await this.refreshToken(true);
                    return this.request(config, attempt + 1);
                }
                if (this.shouldRetry(axiosError) && attempt < this.retryOptions.retries) {
                    const delayMs = this.calculateBackoff(axiosError, attempt, config.url ?? '');
                    await delay(delayMs);
                    return this.request(config, attempt + 1);
                }
                this.failureCount += 1;
                if (this.failureCount >= 3) {
                    this.breakerOpenUntil = Date.now() + 30_000;
                    this.logger.warn('PowerSchool circuit breaker opened', {
                        vendor: 'powerschool',
                        reopenAt: new Date(this.breakerOpenUntil),
                    });
                }
                this.logger.error('PowerSchool request failed', {
                    vendor: 'powerschool',
                    status,
                    url: config.url,
                    message: axiosError.message,
                });
                throw new types_1.IntegrationError(axiosError.message, 'powerschool', status, axiosError.response?.data);
            }
        });
    }
    logSuccess(response, start, endpoint) {
        const latency = Date.now() - start;
        this.logger.debug('PowerSchool request completed', {
            vendor: 'powerschool',
            endpoint,
            status: response.status,
            latency,
        });
    }
    shouldRetry(error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
            return true;
        const status = error.response?.status;
        if (!status)
            return true;
        return this.retryOptions.retryableStatusCodes.includes(status);
    }
    calculateBackoff(error, attempt, endpoint) {
        const retryAfterHeader = error.response?.headers?.[RETRY_AFTER_HEADER];
        const retryAfterSeconds = typeof retryAfterHeader === 'string'
            ? Number.parseInt(retryAfterHeader, 10)
            : undefined;
        const delayMs = retryAfterSeconds
            ? retryAfterSeconds * 1000
            : Math.min(this.retryOptions.minTimeoutMs *
                Math.pow(this.retryOptions.factor, attempt), this.retryOptions.maxTimeoutMs);
        this.logger.warn('PowerSchool request throttled/retrying', {
            vendor: 'powerschool',
            endpoint,
            delayMs,
            attempt,
        });
        return delayMs;
    }
    async refreshToken(force = false) {
        if (this.credentials.authType !== 'oauth2') {
            return this.credentials.clientSecret;
        }
        const isExpired = !this.accessToken ||
            !this.tokenExpiresAt ||
            Date.now() > this.tokenExpiresAt - 60_000;
        if (!force && !isExpired) {
            return this.accessToken;
        }
        const basic = Buffer.from(`${this.credentials.clientId}:${this.credentials.clientSecret}`).toString('base64');
        try {
            const response = await this.axiosInstance.post('/oauth/access_token', new URLSearchParams({
                grant_type: 'client_credentials',
            }), {
                headers: {
                    Authorization: `Basic ${basic}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            this.accessToken = response.data.access_token;
            const expiresInSeconds = response.data.expires_in ?? 900; // Default 15 minutes
            this.tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
            this.logger.info('PowerSchool token refreshed', {
                vendor: 'powerschool',
                expiresInSeconds,
            });
            return this.accessToken;
        }
        catch (error) {
            const axiosError = error;
            this.logger.error('PowerSchool token refresh failed', {
                vendor: 'powerschool',
                status: axiosError.response?.status,
                message: axiosError.message,
            });
            throw new types_1.IntegrationError('Failed to refresh PowerSchool access token', 'powerschool', axiosError.response?.status, axiosError.response?.data);
        }
    }
}
exports.PowerSchoolClient = PowerSchoolClient;
//# sourceMappingURL=powerschool.client.js.map