import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

interface ErrorResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.handleException(exception, request);

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    });
  }

  private handleException(
    exception: unknown,
    request: Request,
  ): { status: number; message: string | string[] } {
    // Xử lý HttpException
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception, request);
    }

    // Xử lý PrismaClientKnownRequestError
    if (exception instanceof PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, request);
    }

    // Xử lý lỗi không xác định
    return this.handleUnknownError(exception, request);
  }

  private handleHttpException(
    exception: HttpException,
    request: Request,
  ): { status: number; message: string | string[] } {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as ErrorResponse).message || 'HTTP error occurred';

    // Log HTTP errors
    const logMessage = `HTTP Exception: ${status} - ${JSON.stringify(message)}`;
    const logContext = `${request.method} ${request.url}`;
    if (status >= 500) {
      this.logger.error(logMessage, exception.stack, logContext);
    } else {
      this.logger.warn(logMessage, logContext);
    }

    return { status, message };
  }

  private handlePrismaError(
    exception: PrismaClientKnownRequestError,
    request: Request,
  ): { status: number; message: string } {
    const { status, message } = this.getPrismaErrorDetails(exception);
    this.logger.error(
      `Prisma Exception: ${exception.code} - ${message}`,
      exception.stack,
      `${request.method} ${request.url}`,
    );
    return { status, message };
  }

  private handleUnknownError(
    exception: unknown,
    request: Request,
  ): { status: number; message: string } {
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = 'Internal server error';
    this.logger.error(
      `Unhandled Exception: ${exception}`,
      exception instanceof Error ? exception.stack : 'No stack trace available',
      `${request.method} ${request.url}`,
    );
    return { status, message };
  }

  private getPrismaErrorDetails(exception: PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    const target = Array.isArray(exception.meta?.target)
      ? (exception.meta?.target as string[]).join(', ')
      : (exception.meta?.target as string | undefined) || 'unknown';

    const errorMap: Record<string, { status: number; message: string }> = {
      P2000: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Value too long for database column',
      },
      P2001: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Value out of range for database column',
      },
      P2002: {
        status: HttpStatus.CONFLICT,
        message: `Duplicate value for field(s): ${target}`,
      },
      P2003: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Foreign key constraint failed',
      },
      P2014: {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid ID provided',
      },
      P2018: {
        status: HttpStatus.NOT_FOUND,
        message: 'Required record not found',
      },
      P2021: {
        status: HttpStatus.NOT_FOUND,
        message: 'Table does not exist',
      },
      P2022: {
        status: HttpStatus.NOT_FOUND,
        message: 'Column does not exist',
      },
      P2025: {
        status: HttpStatus.NOT_FOUND,
        message: 'Record not found',
      },
    };

    return (
      errorMap[exception.code] || {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database error occurred',
      }
    );
  }
}
