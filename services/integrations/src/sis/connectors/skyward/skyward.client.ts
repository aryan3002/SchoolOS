import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import Bottleneck from 'bottleneck';

import {
  defaultRetryOptions,
  IntegrationError,
  Logger,
  RetryOptions,
} from '../../../types';
import type {
  DateRange,
  PaginatedResult,
  QueryOptions,
  SISConnection,
  SISCredentials,
} from '../../interfaces';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * HTTP client for Skyward REST API.
 * Supports OAuth2, API key, and basic auth configurations.
 */
export class SkywardClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly limiter: Bottleneck;
  private readonly retryOptions: RetryOptions;
  private accessToken?: string;
  private tokenExpiresAt?: number;

  constructor(
    private readonly credentials: SISCredentials,
    private readonly logger: Logger,
    retryOptions?: Partial<RetryOptions>,
  ) {
    this.retryOptions = { ...defaultRetryOptions, ...(retryOptions ?? {}) };
    this.axiosInstance = axios.create({
      baseURL: credentials.baseUrl.replace(/\/$/, ''),
      timeout: 30_000,
    });

    this.limiter = new Bottleneck({
      reservoir: 90,
      reservoirRefreshAmount: 90,
      reservoirRefreshInterval: 60_000,
      maxConcurrent: 5,
    });
  }

  async authenticate(): Promise<SISConnection> {
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

  async getStudent(studentId: string): Promise<any> {
    return this.request<any>({
      method: 'GET',
      url: `/api/v1/students/${encodeURIComponent(studentId)}`,
    });
  }

  async listStudents(
    schoolId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<any>> {
    const pageSize = options?.pageSize ?? 200;
    const page = options?.pageToken ? Number(options.pageToken) : 1;
    const params: Record<string, string | number> = {
      schoolId,
      page,
      pageSize,
    };
    if (options?.updatedAfter) {
      params['updatedAfter'] = options.updatedAfter.toISOString();
    }

    const response = await this.request<{
      data?: any[];
      total?: number;
      nextPage?: number;
    }>({
      method: 'GET',
      url: '/api/v1/students',
      params,
    });

    return {
      items: response?.data ?? [],
      nextPageToken:
        response?.nextPage !== undefined
          ? String(response.nextPage)
          : (response?.data?.length ?? 0) === pageSize
            ? String(page + 1)
            : undefined,
      total: response?.total,
    };
  }

  async getGuardians(studentId: string): Promise<any[]> {
    const response = await this.request<{ data?: any[] }>({
      method: 'GET',
      url: `/api/v1/students/${encodeURIComponent(studentId)}/guardians`,
    });
    return response?.data ?? [];
  }

  async getContacts(studentId: string): Promise<any[]> {
    const response = await this.request<{ data?: any[] }>({
      method: 'GET',
      url: `/api/v1/students/${encodeURIComponent(studentId)}/contacts`,
    });
    return response?.data ?? [];
  }

  async getEnrollment(studentId: string): Promise<any> {
    return this.request<any>({
      method: 'GET',
      url: `/api/v1/students/${encodeURIComponent(studentId)}/enrollment`,
    });
  }

  async getSchedule(studentId: string, termId?: string): Promise<any[]> {
    const response = await this.request<{ data?: any[] }>({
      method: 'GET',
      url: `/api/v1/students/${encodeURIComponent(studentId)}/schedule`,
      params: termId ? { termId } : undefined,
    });
    return response?.data ?? [];
  }

  async getGrades(studentId: string, termId?: string): Promise<any[]> {
    const response = await this.request<{ data?: any[] }>({
      method: 'GET',
      url: `/api/v1/students/${encodeURIComponent(studentId)}/grades`,
      params: termId ? { termId } : undefined,
    });
    return response?.data ?? [];
  }

  async getAttendance(studentId: string, dateRange: DateRange): Promise<any[]> {
    const response = await this.request<{ data?: any[] }>({
      method: 'GET',
      url: `/api/v1/students/${encodeURIComponent(studentId)}/attendance`,
      params: {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      },
    });
    return response?.data ?? [];
  }

  async getSectionStudents(sectionId: string): Promise<any[]> {
    const response = await this.request<{ data?: any[] }>({
      method: 'GET',
      url: `/api/v1/sections/${encodeURIComponent(sectionId)}/students`,
    });
    return response?.data ?? [];
  }

  async getRoster(teacherId: string, termId?: string): Promise<any> {
    return this.request<any>({
      method: 'GET',
      url: `/api/v1/teachers/${encodeURIComponent(teacherId)}/roster`,
      params: termId ? { termId } : undefined,
    });
  }

  async getChanges(
    lastSyncTime: Date,
    entityTypes?: string[],
  ): Promise<any[]> {
    const response = await this.request<{ data?: any[] }>({
      method: 'GET',
      url: '/api/v1/changes',
      params: {
        since: lastSyncTime.toISOString(),
        entities: entityTypes?.join(','),
      },
    });
    return response?.data ?? [];
  }

  async listCampuses(): Promise<{ id: string; name?: string }[]> {
    const response = await this.request<{ data?: any[] }>({
      method: 'GET',
      url: '/api/v1/campuses',
    });
    return (response?.data ?? []).map((campus: any) => ({
      id: String(campus.id ?? campus.campusId ?? ''),
      name: campus.name,
    }));
  }

  private async request<T>(
    config: AxiosRequestConfig,
    attempt = 0,
  ): Promise<T> {
    return this.limiter.schedule(async () => {
      try {
        const response = await this.axiosInstance.request<T>({
          ...config,
          headers: {
            Accept: 'application/json',
            ...(await this.buildAuthHeaders()),
            ...(config.headers ?? {}),
          },
        });

        this.logSuccess(response, config.url ?? '');
        return response.data;
      } catch (err) {
        const error = err as AxiosError;
        if (this.shouldRetry(error) && attempt < this.retryOptions.retries) {
          const wait = this.computeBackoff(attempt);
          await sleep(wait);
          return this.request(config, attempt + 1);
        }

        this.logger.error('Skyward request failed', {
          vendor: 'skyward',
          status: error.response?.status,
          url: config.url,
          message: error.message,
        });

        throw new IntegrationError(
          error.message,
          'skyward',
          error.response?.status,
          error.response?.data,
        );
      }
    });
  }

  private async buildAuthHeaders(): Promise<Record<string, string>> {
    if (this.credentials.authType === 'api_key') {
      return { 'X-API-Key': this.credentials.clientSecret };
    }

    if (this.credentials.authType === 'basic') {
      const basic = Buffer.from(
        `${this.credentials.clientId}:${this.credentials.clientSecret}`,
      ).toString('base64');
      return { Authorization: `Basic ${basic}` };
    }

    const token = await this.refreshToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async refreshToken(force = false): Promise<string | undefined> {
    if (this.credentials.authType !== 'oauth2') {
      return undefined;
    }

    const expired =
      force ||
      !this.accessToken ||
      !this.tokenExpiresAt ||
      Date.now() > this.tokenExpiresAt - 60_000;

    if (!expired) {
      return this.accessToken;
    }

    try {
      const response = await this.axiosInstance.post<{
        access_token: string;
        expires_in?: number;
      }>(
        '/oauth2/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in ?? 900;
      this.tokenExpiresAt = Date.now() + expiresIn * 1000;
      this.logger.info('Skyward token refreshed', {
        vendor: 'skyward',
        expiresIn,
      });

      return this.accessToken;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error('Skyward token refresh failed', {
        status: axiosError.response?.status,
        message: axiosError.message,
      });
      throw new IntegrationError(
        'Failed to refresh Skyward token',
        'skyward',
        axiosError.response?.status,
        axiosError.response?.data,
      );
    }
  }

  private logSuccess(response: AxiosResponse<unknown>, url: string): void {
    this.logger.debug('Skyward request completed', {
      vendor: 'skyward',
      url,
      status: response.status,
    });
  }

  private shouldRetry(error: AxiosError): boolean {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return true;
    const status = error.response?.status;
    return (
      !status ||
      this.retryOptions.retryableStatusCodes.includes(status) ||
      status === 401
    );
  }

  private computeBackoff(attempt: number): number {
    return Math.min(
      this.retryOptions.minTimeoutMs *
        Math.pow(this.retryOptions.factor, attempt),
      this.retryOptions.maxTimeoutMs,
    );
  }
}
