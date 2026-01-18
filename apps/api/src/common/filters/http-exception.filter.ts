/**
 * HTTP Exception Filter
 *
 * Standardizes error responses across the API.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
    timestamp: string;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request.headers['x-request-id'] as string) ?? uuidv4();

    let status: number;
    let code: string;
    let message: string;
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.getErrorCode(status);
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res['message'] as string) ?? exception.message;
        code = (res['code'] as string) ?? this.getErrorCode(status);
        details = res['details'] ?? res['errors'];

        // Handle validation errors
        if (Array.isArray(res['message'])) {
          message = 'Validation failed';
          details = res['message'];
        }
      } else {
        message = exception.message;
        code = this.getErrorCode(status);
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      code = 'INTERNAL_ERROR';

      // Log the actual error
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
        { requestId, path: request.url },
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      code = 'UNKNOWN_ERROR';
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
        requestId,
        timestamp: new Date().toISOString(),
      },
    };

    // Remove undefined details
    if (errorResponse.error.details === undefined) {
      delete errorResponse.error.details;
    }

    response.status(status).json(errorResponse);
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return codes[status] ?? 'UNKNOWN_ERROR';
  }
}
