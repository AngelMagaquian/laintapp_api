import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class ErrorLoggerInterceptor implements NestInterceptor {
  constructor(private readonly loggerService: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(error => {
        const request = context.switchToHttp().getRequest();
        const { method, url, body, params, query } = request;
        const userId = request.user?._id || 'system';

        let errorMessage = 'Error interno del servidor';
        let errorDetails = {};

        if (error instanceof HttpException) {
          errorMessage = error.message;
          errorDetails = error.getResponse();
        } else {
          errorDetails = error;
        }

        // Registrar el error en el logger
        this.loggerService.createLog(
          'system',
          'error',
          JSON.stringify({
            message: errorMessage,
            details: errorDetails,
            request: {
              method,
              url,
              body,
              params,
              query,
              userId
            }
          })
        );

        return throwError(() => error);
      })
    );
  }
} 