import { Context, Next } from 'hono';
import { createHmac } from 'crypto';
import { config } from '../core/config/index.js';
import { logger } from '../core/logger/index.js';
import { LineSignatureError } from '../features/line/line.errors.js';
import { LineWebhookBody } from '../features/line/line.types.js';

/**
 * Middleware to validate LINE webhook signature
 * Verifies that the request is genuinely from LINE using HMAC-SHA256
 */
export const validateLineSignature = () => {
  return async (c: Context, next: Next) => {
    const signature = c.req.header('x-line-signature');
    const channelSecret = config.line.channelSecret;

    // Log the validation attempt
    logger.info({
      msg: 'LINE signature validation attempt',
      hasSignature: !!signature,
      path: c.req.path,
    });

    // Check if signature header exists
    if (!signature) {
      logger.warn({
        msg: 'LINE signature validation failed: missing signature header',
        path: c.req.path,
      });
      throw new LineSignatureError();
    }

    // Check if channel secret is configured
    if (!channelSecret) {
      logger.error({
        msg: 'LINE channel secret not configured',
        path: c.req.path,
      });
      return c.json({ error: 'Server configuration error' }, 500);
    }

    try {
      // Get the raw request body as text
      const body = await c.req.text();

      // Generate HMAC-SHA256 signature
      const hmac = createHmac('sha256', channelSecret);
      hmac.update(body);
      const expectedSignature = hmac.digest('base64');

      // Compare signatures
      if (signature !== expectedSignature) {
        logger.warn({
          msg: 'LINE signature validation failed: signature mismatch',
          path: c.req.path,
          receivedSignature: signature.substring(0, 10) + '...',
        });
        throw new LineSignatureError();
      }

      // Parse and validate the webhook body
      let webhookBody: LineWebhookBody;
      try {
        webhookBody = JSON.parse(body);
      } catch (parseError) {
        logger.error({
          msg: 'LINE webhook body parsing failed',
          error: parseError,
          path: c.req.path,
        });
        return c.json({ error: 'Invalid webhook body' }, 400);
      }

      // Attach parsed webhook body to context for downstream handlers
      c.set('lineWebhookBody', webhookBody);

      logger.info({
        msg: 'LINE signature validation successful',
        path: c.req.path,
        eventCount: webhookBody.events?.length || 0,
        destination: webhookBody.destination,
      });

      await next();
    } catch (error) {
      // If it's already a LineSignatureError, rethrow it
      if (error instanceof LineSignatureError) {
        throw error;
      }

      // Log unexpected errors
      logger.error({
        msg: 'Unexpected error during LINE signature validation',
        error,
        path: c.req.path,
      });
      throw error;
    }
  };
};
