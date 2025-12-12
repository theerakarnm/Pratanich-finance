import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { config } from './core/config';
import { checkDbConnection } from './core/database';
import logger from './core/logger';
import { ResponseBuilder } from './core/response';
import { errorMiddleware } from './middleware/error.middleware';
import { loggerMiddleware } from './middleware/logger.middleware';
import router from './routes';
import { initializeNotificationJobs, stopNotificationJobs } from './features/notifications/notification.cron';
import { notificationSchedulerDomain } from './features/notifications/notification-scheduler.domain';
import { initializeAssetCleanupJob } from './features/assets/assets.cron';

const app = new Hono();

// Global Middleware
app.use('*', loggerMiddleware);
app.use('*', cors({
  origin: config.cors.origin,
  allowMethods: config.cors.allowMethods,
  allowHeaders: config.cors.allowHeaders,
  credentials: config.cors.credentials,
}));
app.use('*', errorMiddleware);

// Health Check
app.get('/health', async (c) => {
  const dbStatus = await checkDbConnection();
  return ResponseBuilder.success(c, {
    status: 'ok',
    database: dbStatus ? 'connected' : 'disconnected',
  });
});

// Routes
app.route('/api', router);

// Initialize notification scheduler if enabled
if (config.notification.enabled) {
  try {
    initializeNotificationJobs(notificationSchedulerDomain);
    logger.info(
      {
        event: 'notification_scheduler_initialized',
        enabled: true,
        timezone: config.notification.timezone,
      },
      'Notification scheduler initialized successfully'
    );
  } catch (error) {
    logger.error(
      {
        event: 'notification_scheduler_initialization_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to initialize notification scheduler'
    );
    // Don't exit the process, just log the error
    // The API can still function without notifications
  }
} else {
  logger.info(
    {
      event: 'notification_scheduler_disabled',
      enabled: false,
    },
    'Notification scheduler is disabled'
  );
}

// Initialize asset cleanup job
initializeAssetCleanupJob();

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  logger.info(
    {
      event: 'graceful_shutdown_started',
      signal,
    },
    `Received ${signal}, starting graceful shutdown`
  );

  // Stop notification cron jobs if enabled
  if (config.notification.enabled) {
    try {
      stopNotificationJobs();
      logger.info(
        {
          event: 'notification_jobs_stopped',
        },
        'Notification jobs stopped successfully'
      );
    } catch (error) {
      logger.error(
        {
          event: 'notification_jobs_stop_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to stop notification jobs'
      );
    }
  }

  logger.info(
    {
      event: 'graceful_shutdown_completed',
    },
    'Graceful shutdown completed'
  );

  process.exit(0);
};

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

logger.info(`Server is running on port ${config.port}`);

export default {
  port: config.port,
  fetch: app.fetch,
};
