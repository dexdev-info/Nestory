import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Cùng shape với ApiResponse nhưng success: false
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { statusCode, message, errors } = this.resolveException(exception);

    // Log lỗi 5xx để monitor
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      errors: errors ?? null,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string;
    errors?: string | string[];
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // ValidationPipe trả về object { message: string[], error: string }
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        return {
          statusCode,
          message: (res.error as string) ?? exception.message,
          errors: res.message as string | string[],
        };
      }

      return {
        statusCode,
        message: exceptionResponse as string,
      };
    }

    // Lỗi không xác định -> 500
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
    };
  }
}
