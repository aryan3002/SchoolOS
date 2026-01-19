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

const RETRY_AFTER_HEADER = 'retry-after';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Low-level HTTP client for PowerSchool REST API.
 * Handles OAuth, rate limiting, retries, and structured logging.
 */
export class PowerSchoolClient {
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

    // Token bucket aligned to PowerSchool's 120 req/min limit.
    this.limiter = new Bottleneck({
      reservoir: 120,
      reservoirRefreshAmount: 120,
      reservoirRefreshInterval: 60_000,
      maxConcurrent: 5,
    });
  }

  async authenticate(): Promise<SISConnection> {
    await this.refreshToken(true);

    return {
      status: this.accessToken ? 'connected' : 'failed',
      vendor: 'powerschool',
      expiresAt: this.tokenExpiresAt
        ? new Date(this.tokenExpiresAt)
        : undefined,
    };
  }

  async getStudent(studentId: string): Promise<any> {
    return this.request<any>({
      method: 'GET',
      url: `/ws/v1/student/${encodeURIComponent(studentId)}`,
    });
  }

  async listStudents(
    schoolId: string,
    options?: QueryOptions,
  ): Promise<PaginatedResult<any>> {
    const pageSize = options?.pageSize ?? 200;
    const page = options?.pageToken ? Number(options.pageToken) : 0;

    const params: Record<string, string | number> = {
      pagesize: pageSize,
      page,
    };

    if (options?.updatedAfter) {
      params['updated_after'] = options.updatedAfter.toISOString();
    }

    const response = await this.request<{
      students?: { student?: any[] };
      student?: any[];
      total?: number;
      nextPage?: number;
    }>({
      method: 'GET',
      url: `/ws/v1/school/${encodeURIComponent(schoolId)}/students`,
      params,
    });

    const students =
      response?.students?.student ??
      response?.students ??
      response?.student ??
      [];

    const nextPageToken =
      response?.nextPage !== undefined
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

  async getGuardians(studentId: string): Promise<any[]> {
    const response = await this.request<{ contacts?: { contact?: any[] } }>({
      method: 'GET',
      url: `/ws/v1/student/${encodeURIComponent(studentId)}/contacts`,
    });

    return response?.contacts?.contact ?? [];
  }

  async getContacts(studentId: string): Promise<any[]> {
    const response = await this.request<{ contacts?: { contact?: any[] } }>({
      method: 'GET',
      url: `/ws/v1/student/${encodeURIComponent(studentId)}/emergency_contacts`,
    });

    return response?.contacts?.contact ?? [];
  }

  async getEnrollment(studentId: string): Promise<any> {
    return this.request<any>({
      method: 'GET',
      url: `/ws/v1/student/${encodeURIComponent(studentId)}/enrollments`,
    });
  }

  async getSchedule(studentId: string, termId?: string): Promise<any[]> {
    const params = termId ? { termid: termId } : undefined;
    const response = await this.request<{ sections?: { section?: any[] } }>({
      method: 'GET',
      url: `/ws/v1/student/${encodeURIComponent(studentId)}/sections`,
      params,
    });

    return response?.sections?.section ?? [];
  }

  async getGrades(studentId: string, termId?: string): Promise<any[]> {
    const params = termId ? { termid: termId } : undefined;
    const response = await this.request<{ grades?: { grade?: any[] } }>({
      method: 'GET',
      url: `/ws/v1/student/${encodeURIComponent(studentId)}/grades`,
      params,
    });

    return response?.grades?.grade ?? [];
  }

  async getAttendance(studentId: string, dateRange: DateRange): Promise<any[]> {
    const response = await this.request<{ attendance?: { att_code?: any[] } }>(
      {
        method: 'GET',
        url: `/ws/v1/student/${encodeURIComponent(studentId)}/attendance`,
        params: {
          start_date: dateRange.start.toISOString().split('T')[0],
          end_date: dateRange.end.toISOString().split('T')[0],
        },
      },
    );

    return response?.attendance?.att_code ?? [];
  }

  async getAssignments(studentId: string): Promise<any[]> {
    const response = await this.request<{ assignments?: { assignment?: any[] } }>(
      {
        method: 'GET',
        url: `/ws/v1/student/${encodeURIComponent(studentId)}/assignments`,
      },
    );

    return response?.assignments?.assignment ?? [];
  }

  async getSectionStudents(sectionId: string): Promise<any[]> {
    const response = await this.request<{ students?: { student?: any[] } }>({
      method: 'GET',
      url: `/ws/v1/section/${encodeURIComponent(sectionId)}/students`,
    });

    return response?.students?.student ?? [];
  }

  async getRoster(teacherId: string, termId?: string): Promise<any> {
    const params = termId ? { termid: termId } : undefined;
    return this.request<any>({
      method: 'GET',
      url: `/ws/v1/teacher/${encodeURIComponent(teacherId)}/roster`,
      params,
    });
  }

  async getChanges(
    lastSyncTime: Date,
    entityTypes?: string[],
  ): Promise<any[]> {
    const response = await this.request<{ changes?: { change?: any[] } }>({
      method: 'GET',
      url: `/ws/v1/changes`,
      params: {
        since: lastSyncTime.toISOString(),
        entities: entityTypes?.join(','),
      },
    });

    return response?.changes?.change ?? [];
  }

  async listSchools(): Promise<{ id: string; name?: string }[]> {
    const response = await this.request<{ schools?: { school?: any[] } }>({
      method: 'GET',
      url: '/ws/v1/district/schools',
    });

    const schools = response?.schools?.school ?? [];
    return Array.isArray(schools) ? schools : [];
  }

  private async request<T>(
    config: AxiosRequestConfig,
    attempt = 0,
  ): Promise<T> {
    return this.limiter.schedule(async () => {
      const start = Date.now();
      try {
        const token = await this.refreshToken();
        const response = await this.axiosInstance.request<T>({
          ...config,
          headers: {
            Accept: 'application/json',
            ...(config.headers ?? {}),
            Authorization:
              this.credentials.authType === 'oauth2' && token
                ? `Bearer ${token}`
                : config.headers?.Authorization,
          },
        });

        this.logSuccess(response, start, config.url ?? '');
        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;

        if (status === 401 && attempt === 0) {
          await this.refreshToken(true);
          return this.request<T>(config, attempt + 1);
        }

        if (this.shouldRetry(axiosError) && attempt < this.retryOptions.retries) {
          const delayMs = this.calculateBackoff(
            axiosError,
            attempt,
            config.url ?? '',
          );
          await delay(delayMs);
          return this.request<T>(config, attempt + 1);
        }

        this.logger.error('PowerSchool request failed', {
          vendor: 'powerschool',
          status,
          url: config.url,
          message: axiosError.message,
        });

        throw new IntegrationError(
          axiosError.message,
          'powerschool',
          status,
          axiosError.response?.data,
        );
      }
    });
  }

  private logSuccess(
    response: AxiosResponse<unknown>,
    start: number,
    endpoint: string,
  ): void {
    const latency = Date.now() - start;
    this.logger.debug('PowerSchool request completed', {
      vendor: 'powerschool',
      endpoint,
      status: response.status,
      latency,
    });
  }

  private shouldRetry(error: AxiosError): boolean {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return true;
    const status = error.response?.status;
    if (!status) return true;
    return this.retryOptions.retryableStatusCodes.includes(status);
  }

  private calculateBackoff(
    error: AxiosError,
    attempt: number,
    endpoint: string,
  ): number {
    const retryAfterHeader = error.response?.headers?.[RETRY_AFTER_HEADER];
    const retryAfterSeconds =
      typeof retryAfterHeader === 'string'
        ? Number.parseInt(retryAfterHeader, 10)
        : undefined;

    const delayMs = retryAfterSeconds
      ? retryAfterSeconds * 1000
      : Math.min(
          this.retryOptions.minTimeoutMs *
            Math.pow(this.retryOptions.factor, attempt),
          this.retryOptions.maxTimeoutMs,
        );

    this.logger.warn('PowerSchool request throttled/retrying', {
      vendor: 'powerschool',
      endpoint,
      delayMs,
      attempt,
    });

    return delayMs;
  }

  private async refreshToken(force = false): Promise<string | undefined> {
    if (this.credentials.authType !== 'oauth2') {
      return this.credentials.clientSecret;
    }

    const isExpired =
      !this.accessToken ||
      !this.tokenExpiresAt ||
      Date.now() > this.tokenExpiresAt - 60_000;

    if (!force && !isExpired) {
      return this.accessToken;
    }

    const basic = Buffer.from(
      `${this.credentials.clientId}:${this.credentials.clientSecret}`,
    ).toString('base64');

    try {
      const response = await this.axiosInstance.post<{
        access_token: string;
        expires_in?: number;
      }>(
        '/oauth/access_token',
        new URLSearchParams({
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.accessToken = response.data.access_token;
      const expiresInSeconds = response.data.expires_in ?? 900; // Default 15 minutes
      this.tokenExpiresAt = Date.now() + expiresInSeconds * 1000;

      this.logger.info('PowerSchool token refreshed', {
        vendor: 'powerschool',
        expiresInSeconds,
      });

      return this.accessToken;
    } catch (error) {
      const axiosError = error as AxiosError;
      this.logger.error('PowerSchool token refresh failed', {
        vendor: 'powerschool',
        status: axiosError.response?.status,
        message: axiosError.message,
      });
      throw new IntegrationError(
        'Failed to refresh PowerSchool access token',
        'powerschool',
        axiosError.response?.status,
        axiosError.response?.data,
      );
    }
  }
}
