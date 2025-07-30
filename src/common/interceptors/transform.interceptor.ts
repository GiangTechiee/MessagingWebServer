import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Response } from 'express';

interface IResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, IResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<IResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((data) => {
        // Return unchanged if data is already in IResponse format
        if (
          data &&
          typeof data === 'object' &&
          'statusCode' in data &&
          'message' in data &&
          'data' in data
          
        ) {
          return data as IResponse<T>;
        }

        return {
          statusCode,
          message: 'Success',
          data,
        };
      }),
    );
  }
}
