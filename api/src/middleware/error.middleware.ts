import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { AppError } from '../core/errors';
import logger from '../core/logger';
import { ResponseBuilder } from '../core/response';
import { ContentfulStatusCode } from 'hono/utils/http-status';
import {
  ConnectCodeNotFoundError,
  ConnectCodeExpiredError,
  ConnectCodeAlreadyUsedError,
  LineUserIdAlreadyConnectedError,
  RateLimitExceededError,
} from '../features/connect/connect.errors';

export const errorMiddleware = async (c: Context, next: Next) => {
  try {
    await next();
  } catch (err: any) {
    const requestId = c.req.header('x-request-id') || 'unknown';

    // Log error with details
    logger.error({
      error: err.message,
      errorName: err.name,
      stack: err.stack,
      url: c.req.url,
      method: c.req.method,
      requestId,
      cause: err.cause?.message,
    });

    // Handle connect-specific errors
    if (err instanceof ConnectCodeNotFoundError) {
      return ResponseBuilder.error(
        c,
        err.message,
        400,
        'CONNECT_CODE_NOT_FOUND'
      );
    }

    if (err instanceof ConnectCodeExpiredError) {
      return ResponseBuilder.error(
        c,
        err.message,
        400,
        'CONNECT_CODE_EXPIRED'
      );
    }

    if (err instanceof ConnectCodeAlreadyUsedError) {
      return ResponseBuilder.error(
        c,
        err.message,
        400,
        'CONNECT_CODE_ALREADY_USED'
      );
    }

    if (err instanceof LineUserIdAlreadyConnectedError) {
      return ResponseBuilder.error(
        c,
        err.message,
        409,
        'LINE_USER_ID_ALREADY_CONNECTED'
      );
    }

    if (err instanceof RateLimitExceededError) {
      return ResponseBuilder.error(
        c,
        err.message,
        429,
        'RATE_LIMIT_EXCEEDED',
        { retryAfter: err.retryAfter }
      );
    }

    // Handle Zod validation errors
    if (err instanceof ZodError) {
      const details = err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));

      return ResponseBuilder.error(
        c,
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        details
      );
    }

    // Handle custom AppError
    if (err instanceof AppError) {
      return ResponseBuilder.error(
        c,
        err.message,
        err.statusCode as ContentfulStatusCode,
        err.code,
        err.details
      );
    }

    // Handle Hono HTTPException
    if (err instanceof HTTPException) {
      return ResponseBuilder.error(
        c,
        err.message,
        err.status,
        'HTTP_EXCEPTION'
      );
    }

    // Handle unknown errors
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    return ResponseBuilder.error(
      c,
      message,
      status,
      'INTERNAL_ERROR'
    );
  }
};
