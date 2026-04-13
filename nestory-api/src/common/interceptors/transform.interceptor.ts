import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

// Decorator để override message mặc định per-route
export const ResponseMessage = (message: string) => SetMetadata('response_message', message);

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse();

    // Lấy message từ decorator @ResponseMessage() nếu có,
    // fallback về message mặc định theo HTTP method
    const customMessage = this.reflector.getAllAndOverride<string>('response_message', [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode: response.statusCode,
        message: customMessage ?? this.getDefaultMessage(request.method),
        data: data ?? null,
        timestamp: new Date().toISOString(),
        path: request.url,
      })),
    );
  }

  private getDefaultMessage(method: string): string {
    const messages: Record<string, string> = {
      GET: 'Get data successfully',
      POST: 'Create new item successfully',
      PATCH: 'Update item successfully',
      PUT: 'Update item successfully',
      DELETE: 'Delete item successfully',
    };
    return messages[method] ?? 'Success';
  }
}
