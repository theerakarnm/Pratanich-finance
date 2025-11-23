import { AppError } from '../../core/errors/index.js';

/**
 * Error thrown when LINE Messaging API returns an error response
 */
export class LineApiError extends AppError {
  constructor(message: string, lineErrorCode?: string, details?: any) {
    super(
      message,
      500,
      'LINE_API_ERROR',
      {
        lineErrorCode,
        ...details,
      }
    );
  }
}

/**
 * Error thrown when LINE webhook signature validation fails
 */
export class LineSignatureError extends AppError {
  constructor() {
    super('Invalid LINE signature', 401, 'INVALID_LINE_SIGNATURE');
  }
}

/**
 * Error thrown when LINE message processing fails
 */
export class LineMessageError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'LINE_MESSAGE_ERROR', details);
  }
}
