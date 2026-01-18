/**
 * Transform Interceptor
 *
 * Wraps all successful responses in a standard format.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
    pagination?: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) ?? uuidv4();

    return next.handle().pipe(
      map((data) => {
        // If data already has a success property, return as-is
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Extract pagination info if present
        let responseData = data;
        let pagination: { page: number; pageSize: number; total: number; totalPages: number } | undefined = undefined;

        if (data && typeof data === 'object' && 'items' in data && 'pagination' in data) {
          responseData = (data as { items: unknown; pagination: typeof pagination }).items;
          pagination = (data as { items: unknown; pagination: typeof pagination }).pagination;
        }

        const response: ApiResponse<T> = {
          success: true,
          data: responseData,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
          },
        };

        if (pagination) {
          response.meta!.pagination = pagination;
        }

        return response;
      }),
    );
  }
}
