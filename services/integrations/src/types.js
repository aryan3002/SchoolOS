"use strict";
/**
 * Shared types for integrations package.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationError = exports.defaultRetryOptions = exports.ConsoleLogger = void 0;
/**
 * Lightweight console logger fallback for environments without structured logging.
 */
class ConsoleLogger {
    debug(message, meta) {
        // eslint-disable-next-line no-console
        console.debug(message, meta ?? {});
    }
    info(message, meta) {
        // eslint-disable-next-line no-console
        console.info(message, meta ?? {});
    }
    warn(message, meta) {
        // eslint-disable-next-line no-console
        console.warn(message, meta ?? {});
    }
    error(message, meta) {
        // eslint-disable-next-line no-console
        console.error(message, meta ?? {});
    }
    child(bindings) {
        return {
            debug: (msg, meta) => this.debug(msg, { ...bindings, ...(meta ?? {}) }),
            info: (msg, meta) => this.info(msg, { ...bindings, ...(meta ?? {}) }),
            warn: (msg, meta) => this.warn(msg, { ...bindings, ...(meta ?? {}) }),
            error: (msg, meta) => this.error(msg, { ...bindings, ...(meta ?? {}) }),
            child: (childBindings) => this.child({ ...bindings, ...(childBindings ?? {}) }),
        };
    }
}
exports.ConsoleLogger = ConsoleLogger;
exports.defaultRetryOptions = {
    retries: 3,
    factor: 2,
    minTimeoutMs: 300,
    maxTimeoutMs: 5000,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};
class IntegrationError extends Error {
    vendor;
    statusCode;
    details;
    constructor(message, vendor, statusCode, details) {
        super(message);
        this.vendor = vendor;
        this.statusCode = statusCode;
        this.details = details;
    }
}
exports.IntegrationError = IntegrationError;
//# sourceMappingURL=types.js.map