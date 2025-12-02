import { Hono } from 'hono';
import { config } from '../core/config';
import { logger } from '../core/logger';
import { ResponseBuilder } from '../core/response';
import { validateLineSignature } from '../middleware/line-signature.middleware';
import { LineMessagingClient } from '../features/line/line.client';
import { LineReplyUtil } from '../features/line/utils/line-reply.util';
import { LineEventRouter } from '../features/line/line.router';
import { LineDomain } from '../features/line/line.domain';
import {
  TextMessageHandler,
  ImageMessageHandler,
  PostbackHandler,
} from '../features/line/handlers';
import type { LineWebhookBody } from '../features/line/line.types';
import { paymentDomain } from '../features/payments/payments.domain';
import { paymentMatchingService } from '../features/payments/payment-matching.service';
import { PendingPaymentsRepository } from '../features/payments/pending-payments.repository';

// Define context variables for LINE routes
type LineVariables = {
  lineWebhookBody: LineWebhookBody;
};

const lineRoutes = new Hono<{ Variables: LineVariables }>();

// Initialize LINE components with dependency injection
const lineClient = new LineMessagingClient(
  config.line.channelAccessToken,
  config.line.messagingApiUrl
);

const lineReplyUtil = new LineReplyUtil(lineClient);

// Initialize payment dependencies
const pendingPaymentsRepository = new PendingPaymentsRepository();

// Create event router and register handlers
const eventRouter = new LineEventRouter();
const lineDomain = new LineDomain(lineClient, lineReplyUtil, eventRouter);

// Register event handlers
eventRouter.registerHandler(new TextMessageHandler(lineReplyUtil));
eventRouter.registerHandler(
  new ImageMessageHandler(
    lineClient,
    lineReplyUtil,
    paymentDomain,
    paymentMatchingService,
    pendingPaymentsRepository
  )
);
eventRouter.registerHandler(new PostbackHandler(lineReplyUtil));

logger.info(
  {
    handlerCount: eventRouter.getHandlerCount(),
    channelConfigured: !!config.line.channelAccessToken,
  },
  'LINE routes initialized'
);

/**
 * POST /webhook
 * LINE webhook endpoint for receiving events
 * Validates signature and processes events
 */
lineRoutes.post('/webhook', validateLineSignature(), async (c) => {
  const startTime = Date.now();
  const webhookBody = c.get('lineWebhookBody') as LineWebhookBody;

  try {
    logger.info(
      {
        destination: webhookBody.destination,
        eventCount: webhookBody.events?.length || 0,
        eventTypes: webhookBody.events?.map(e => e.type) || [],
      },
      'Received LINE webhook request'
    );

    // Process webhook events
    await lineDomain.processWebhook(webhookBody);

    const duration = Date.now() - startTime;

    logger.info(
      {
        destination: webhookBody.destination,
        eventCount: webhookBody.events?.length || 0,
        duration,
      },
      'LINE webhook processed successfully'
    );

    // Return 200 OK response within 3 seconds as required by LINE
    return c.json({ success: true }, 200);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        destination: webhookBody.destination,
        eventCount: webhookBody.events?.length || 0,
        duration,
      },
      'Failed to process LINE webhook'
    );

    // Still return 200 to LINE to prevent retries
    // The error has been logged and individual event errors are handled
    return c.json({ success: true }, 200);
  }
});

/**
 * GET /webhook
 * Health check endpoint for LINE webhook
 */
lineRoutes.get('/webhook', async (c) => {
  return ResponseBuilder.success(c, {
    status: 'ok',
    service: 'LINE webhook',
    configured: !!config.line.channelAccessToken && !!config.line.channelSecret,
  });
});

export default lineRoutes;
