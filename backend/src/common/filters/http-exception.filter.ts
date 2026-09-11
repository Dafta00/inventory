import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const { status, message, shouldLogFully } = this.resolve(exception);

    if (shouldLogFully) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  private resolve(exception: unknown): {
    status: number;
    message: string | string[];
    shouldLogFully: boolean;
  } {
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : ((exceptionResponse as any)?.message ?? exception.message);
      return { status: exception.getStatus(), message, shouldLogFully: false };
    }

    // Prisma errors are never HttpExceptions, so without this they would all
    // surface to the client as a bare 500 "Internal server error" - fine for
    // truly unexpected failures, but wrong for well-understood cases like a
    // unique-constraint race (e.g. two requests generating the same invoice
    // number a few milliseconds apart) which deserve a 409, not a 500.
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          const target = (exception.meta?.target as string[] | undefined)?.join(', ');
          return {
            status: HttpStatus.CONFLICT,
            message: target
              ? `A record with this ${target} already exists. Please try again.`
              : 'This record already exists.',
            shouldLogFully: false,
          };
        }
        case 'P2025':
          return {
            status: HttpStatus.NOT_FOUND,
            message: 'The requested record could not be found.',
            shouldLogFully: false,
          };
        case 'P2003':
          return {
            status: HttpStatus.BAD_REQUEST,
            message: 'This action references a record that does not exist or was removed.',
            shouldLogFully: false,
          };
        case 'P2034':
          // Serializable transaction lost a write conflict to a concurrent
          // request touching the same rows (e.g. two returns against the
          // same line item at once). The conflict is exactly the safety
          // mechanism working as intended - the client should just retry.
          return {
            status: HttpStatus.CONFLICT,
            message: 'This record was updated by another request at the same time. Please try again.',
            shouldLogFully: false,
          };
        default:
          this.logger.warn(`Unhandled Prisma error code ${exception.code}: ${exception.message}`);
          return {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            shouldLogFully: true,
          };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      shouldLogFully: true,
    };
  }
}
