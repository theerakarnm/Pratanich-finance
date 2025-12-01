import { Context, Next } from 'hono';
import { randomUUID } from 'crypto';
import logger from '../core/logger';

export const loggerMiddleware = async (c: Context, next: Next) => {
  const start = Date.now();
  const { method, url } = c.req;
  
  // Generate or use existing request ID
  let requestId = c.req.header('x-request-id');
  if (!requestId) {
    requestId = randomUUID();
    c.req.raw.headers.set('x-request-id', requestId);
  }
  
  logger.info({
    type: 'request',
    method,
    url,
    requestId,
  });

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info({
    type: 'response',
    method,
    url,
    status,
    duration: `${duration}ms`,
    requestId,
  });
};
