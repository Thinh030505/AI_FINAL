import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse: any =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse.message || exceptionResponse.error || 'Something went wrong'
        : typeof exceptionResponse === 'string'
        ? exceptionResponse
        : 'Something went wrong';

    const errorCode =
      typeof exceptionResponse === 'object' && exceptionResponse !== null && exceptionResponse.error
        ? exceptionResponse.error
        : status === HttpStatus.INTERNAL_SERVER_ERROR
        ? 'INTERNAL_SERVER_ERROR'
        : 'HTTP_ERROR';

    response.status(status).json({
      success: false,
      message,
      error: errorCode,
    });
  }
}
