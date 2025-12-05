import type { NotificationSchedulerDomain } from './notification-scheduler.domain';
import type { ScheduledTask } from 'node-cron';
import logger from '../../core/logger';
import { logCronTrigger, logCronError } from './notification-logging.utils';
import cron from 'node-cron';

/**
 * Cron jobs for notification scheduler
 * Uses node-cron for scheduling notification jobs
 * All times are in Asia/Bangkok timezone
 */

// Store cron job instances for graceful shutdown
let billingJob: ScheduledTask | null = null;
let warningJob: ScheduledTask | null = null;
let dueDateJob: ScheduledTask | null = null;
let overdueJob: ScheduledTask | null = null;

/**
 * Initialize all notification cron jobs
 * Schedules jobs to run at specified times in Asia/Bangkok timezone
 * 
 * @param schedulerDomain - NotificationSchedulerDomain instance with all dependencies
 * @throws Error if cron initialization fails
 */
export function initializeNotificationJobs(
  schedulerDomain: NotificationSchedulerDomain
): void {
  try {
    logger.info(
      {
        event: 'notification_cron_initialization_started',
        timezone: 'Asia/Bangkok',
      },
      'Initializing notification cron jobs'
    );

    // Billing notification job - Daily at 9:00 AM Asia/Bangkok
    billingJob = cron.schedule(
      '0 9 * * *',
      async () => {
        const scheduledTime = new Date();
        logCronTrigger('billing_notifications', scheduledTime);

        try {
          await schedulerDomain.sendBillingNotifications();
        } catch (error) {
          logCronError('billing_notifications', error);
        }
      },
      {
        timezone: 'Asia/Bangkok',
      }
    );

    logger.info(
      {
        event: 'cron_job_initialized',
        jobName: 'billing_notifications',
        schedule: '0 9 * * * (9:00 AM daily)',
        timezone: 'Asia/Bangkok',
      },
      'Billing notification job initialized'
    );

    // Warning notification job - Daily at 9:00 AM Asia/Bangkok
    warningJob = cron.schedule(
      '0 9 * * *',
      async () => {
        const scheduledTime = new Date();
        logCronTrigger('warning_notifications', scheduledTime);

        try {
          await schedulerDomain.sendWarningNotifications();
        } catch (error) {
          logCronError('warning_notifications', error);
        }
      },
      {
        timezone: 'Asia/Bangkok',
      }
    );

    logger.info(
      {
        event: 'cron_job_initialized',
        jobName: 'warning_notifications',
        schedule: '0 9 * * * (9:00 AM daily)',
        timezone: 'Asia/Bangkok',
      },
      'Warning notification job initialized'
    );

    // Due date notification job - Daily at 8:00 AM Asia/Bangkok
    dueDateJob = cron.schedule(
      '0 8 * * *',
      async () => {
        const scheduledTime = new Date();
        logCronTrigger('due_date_notifications', scheduledTime);

        try {
          await schedulerDomain.sendDueDateNotifications();
        } catch (error) {
          logCronError('due_date_notifications', error);
        }
      },
      {
        timezone: 'Asia/Bangkok',
      }
    );

    logger.info(
      {
        event: 'cron_job_initialized',
        jobName: 'due_date_notifications',
        schedule: '0 8 * * * (8:00 AM daily)',
        timezone: 'Asia/Bangkok',
      },
      'Due date notification job initialized'
    );

    // Overdue notification job - Daily at 10:00 AM Asia/Bangkok
    overdueJob = cron.schedule(
      '0 10 * * *',
      async () => {
        const scheduledTime = new Date();
        logCronTrigger('overdue_notifications', scheduledTime);

        try {
          await schedulerDomain.sendOverdueNotifications();
        } catch (error) {
          logCronError('overdue_notifications', error);
        }
      },
      {
        timezone: 'Asia/Bangkok',
      }
    );

    logger.info(
      {
        event: 'cron_job_initialized',
        jobName: 'overdue_notifications',
        schedule: '0 10 * * * (10:00 AM daily)',
        timezone: 'Asia/Bangkok',
      },
      'Overdue notification job initialized'
    );

    logger.info(
      {
        event: 'notification_cron_initialization_completed',
        jobsInitialized: 4,
        jobs: [
          'billing_notifications',
          'warning_notifications',
          'due_date_notifications',
          'overdue_notifications',
        ],
      },
      'All notification cron jobs initialized successfully'
    );
  } catch (error) {
    logger.error(
      {
        event: 'notification_cron_initialization_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to initialize notification cron jobs'
    );

    throw error;
  }
}

/**
 * Stop all notification cron jobs
 * Used for graceful shutdown
 */
export function stopNotificationJobs(): void {
  try {
    logger.info(
      {
        event: 'notification_cron_shutdown_started',
      },
      'Stopping notification cron jobs'
    );

    let stoppedCount = 0;

    if (billingJob) {
      billingJob.stop();
      billingJob = null;
      stoppedCount++;
      logger.info(
        {
          event: 'cron_job_stopped',
          jobName: 'billing_notifications',
        },
        'Billing notification job stopped'
      );
    }

    if (warningJob) {
      warningJob.stop();
      warningJob = null;
      stoppedCount++;
      logger.info(
        {
          event: 'cron_job_stopped',
          jobName: 'warning_notifications',
        },
        'Warning notification job stopped'
      );
    }

    if (dueDateJob) {
      dueDateJob.stop();
      dueDateJob = null;
      stoppedCount++;
      logger.info(
        {
          event: 'cron_job_stopped',
          jobName: 'due_date_notifications',
        },
        'Due date notification job stopped'
      );
    }

    if (overdueJob) {
      overdueJob.stop();
      overdueJob = null;
      stoppedCount++;
      logger.info(
        {
          event: 'cron_job_stopped',
          jobName: 'overdue_notifications',
        },
        'Overdue notification job stopped'
      );
    }

    logger.info(
      {
        event: 'notification_cron_shutdown_completed',
        jobsStopped: stoppedCount,
      },
      'All notification cron jobs stopped successfully'
    );
  } catch (error) {
    logger.error(
      {
        event: 'notification_cron_shutdown_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to stop notification cron jobs'
    );

    throw error;
  }
}
