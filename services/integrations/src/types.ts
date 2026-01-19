/**
 * Shared types for integrations package.
 */

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  child?(bindings: Record<string, unknown>): Logger;
}

/**
 * Lightweight console logger fallback for environments without structured logging.
 */
export class ConsoleLogger implements Logger {
  debug(message: string, meta?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.debug(message, meta ?? {});
  }

  info(message: string, meta?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.info(message, meta ?? {});
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.warn(message, meta ?? {});
  }

  error(message: string, meta?: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.error(message, meta ?? {});
  }

  child(bindings: Record<string, unknown>): Logger {
    return {
      debug: (msg, meta) => this.debug(msg, { ...bindings, ...(meta ?? {}) }),
      info: (msg, meta) => this.info(msg, { ...bindings, ...(meta ?? {}) }),
      warn: (msg, meta) => this.warn(msg, { ...bindings, ...(meta ?? {}) }),
      error: (msg, meta) => this.error(msg, { ...bindings, ...(meta ?? {}) }),
      child: (childBindings) => this.child({ ...bindings, ...(childBindings ?? {}) }),
    };
  }
}

export interface RetryOptions {
  retries: number;
  factor: number;
  minTimeoutMs: number;
  maxTimeoutMs: number;
  retryableStatusCodes: number[];
}

export const defaultRetryOptions: RetryOptions = {
  retries: 3,
  factor: 2,
  minTimeoutMs: 300,
  maxTimeoutMs: 5000,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

export interface RequestMetrics {
  durationMs: number;
  status: number;
  endpoint: string;
  vendor: string;
}

export class IntegrationError extends Error {
  public readonly vendor: string;
  public readonly statusCode?: number;
  public readonly details?: unknown;

  constructor(message: string, vendor: string, statusCode?: number, details?: unknown) {
    super(message);
    this.vendor = vendor;
    this.statusCode = statusCode;
    this.details = details;
  }
}
