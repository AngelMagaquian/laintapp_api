import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class HttpErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(error => {
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Error interno del servidor';

        if (error instanceof HttpException) {
          status = error.getStatus();
          message = error.message;
        }

        return throwError(() => ({
          statusCode: status,
          timestamp: new Date().toISOString(),
          path: context.switchToHttp().getRequest().url,
          message,
          error: error.name,
        }));
      }),
    );
  }
} 