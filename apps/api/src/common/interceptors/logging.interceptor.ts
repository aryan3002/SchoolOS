/**
 * Logging Interceptor
 *
 * Logs all incoming requests and outgoing responses.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const requestId = (request.headers['x-request-id'] as string) ?? uuidv4();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') ?? 'unknown';
    const districtId = request.headers['x-district-id'] as string | undefined;

    const startTime = Date.now();

    // Set request ID header for response
    response.setHeader('X-Request-ID', requestId);

    // Log incoming request
    this.logger.log(
      `→ ${method} ${url} [${requestId}]`,
      {
        requestId,
        method,
        url,
        ip,
        userAgent: userAgent.substring(0, 100),
        districtId,
      },
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.log(
            `← ${method} ${url} ${statusCode} ${duration}ms [${requestId}]`,
            {
              requestId,
              method,
              url,
              statusCode,
              duration,
            },
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;

          this.logger.error(
            `✖ ${method} ${url} ${duration}ms [${requestId}] ${error.message}`,
            {
              requestId,
              method,
              url,
              duration,
              error: error.message,
            },
          );
        },
      }),
    );
  }
}
