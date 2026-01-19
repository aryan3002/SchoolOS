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
export declare class ConsoleLogger implements Logger {
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, meta?: Record<string, unknown>): void;
    child(bindings: Record<string, unknown>): Logger;
}
export interface RetryOptions {
    retries: number;
    factor: number;
    minTimeoutMs: number;
    maxTimeoutMs: number;
    retryableStatusCodes: number[];
}
export declare const defaultRetryOptions: RetryOptions;
export interface RequestMetrics {
    durationMs: number;
    status: number;
    endpoint: string;
    vendor: string;
}
export declare class IntegrationError extends Error {
    readonly vendor: string;
    readonly statusCode?: number;
    readonly details?: unknown;
    constructor(message: string, vendor: string, statusCode?: number, details?: unknown);
}
//# sourceMappingURL=types.d.ts.map