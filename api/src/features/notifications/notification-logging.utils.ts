import type { NotificationJobResult } from './notification.types';
import logger from '../../core/logger';

/**
 * Utility functions for notification job logging and metrics tracking
 * Provides structured logging helpers for notification scheduler operations
 */

/**
 * Log notification job start with structured data
 * 
 * @param jobName - Name of the notification job
 * @param scheduledTime - Time the job was scheduled to run
 */
export function logJobStart(jobName: string, scheduledTime?: Date): void {
  const startTime = new Date();

  logger.info(
    {
      event: 'notification_job_started',
      jobName,
      startTime: startTime.toISOString(),
      scheduledTime: scheduledTime?.toISOString(),
      timezone: 'Asia/Bangkok',
    },
    `Starting ${jobName} job`
  );
}

/**
 * Log notification job completion with comprehensive metrics
 * Includes timing, counts, success rate, and error details
 * 
 * @param result - NotificationJobResult with execution summary
 */
export function logJobResult(result: NotificationJobResult): void {
  const durationMs = result.endTime.getTime() - result.startTime.getTime();
  const durationSeconds = (durationMs / 1000).toFixed(2);
  const successRate = result.loansProcessed > 0
    ? ((result.notificationsSent / result.loansProcessed) * 100).toFixed(2)
    : '0.00';

  logger.info(
    {
      event: 'notification_job_completed',
      jobName: result.jobName,
      startTime: result.startTime.toISOString(),
      endTime: result.endTime.toISOString(),
      durationMs,
      durationSeconds: parseFloat(durationSeconds),
      loansProcessed: result.loansProcessed,
      notificationsSent: result.notificationsSent,
      notificationsFailed: result.notificationsFailed,
      successRate: parseFloat(successRate),
      errorCount: result.errors.length,
      errors: result.errors.length > 0 ? result.errors : undefined,
      timezone: 'Asia/Bangkok',
    },
    `${result.jobName} completed: ${result.notificationsSent}/${result.loansProcessed} sent (${successRate}% success) in ${durationSeconds}s`
  );
}

/**
 * Log notification job failure with error details
 * 
 * @param jobName - Name of the notification job
 * @param startTime - Time the job started
 * @param error - Error that caused the job to fail
 */
export function logJobFailure(
  jobName: string,
  startTime: Date,
  error: unknown
): void {
  const endTime = new Date();
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationSeconds = (durationMs / 1000).toFixed(2);

  logger.error(
    {
      event: 'notification_job_failed',
      jobName,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMs,
      durationSeconds: parseFloat(durationSeconds),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timezone: 'Asia/Bangkok',
    },
    `${jobName} failed after ${durationSeconds}s: ${error instanceof Error ? error.message : 'Unknown error'}`
  );
}

/**
 * Log loans identified for notification with selection criteria
 * 
 * @param jobName - Name of the notification job
 * @param loansFound - Number of loans identified
 * @param criteria - Selection criteria used (optional)
 */
export function logLoansIdentified(
  jobName: string,
  loansFound: number,
  criteria?: Record<string, any>
): void {
  logger.info(
    {
      event: 'loans_identified',
      jobName,
      loansFound,
      criteria,
      timezone: 'Asia/Bangkok',
    },
    `Found ${loansFound} loans for ${jobName}`
  );
}

/**
 * Log individual notification send success
 * 
 * @param jobName - Name of the notification job
 * @param loanId - Loan ID
 * @param clientId - Client ID
 * @param lineUserId - LINE user ID
 * @param notificationType - Type of notification
 * @param billingPeriod - Billing period
 */
export function logNotificationSent(
  jobName: string,
  loanId: string,
  clientId: string,
  lineUserId: string,
  notificationType: string,
  billingPeriod: string
): void {
  logger.info(
    {
      event: 'notification_sent',
      jobName,
      loanId,
      clientId,
      lineUserId,
      notificationType,
      billingPeriod,
      timestamp: new Date().toISOString(),
      timezone: 'Asia/Bangkok',
    },
    `Notification sent: ${notificationType} for loan ${loanId}`
  );
}

/**
 * Log individual notification send failure with error details
 * 
 * @param jobName - Name of the notification job
 * @param loanId - Loan ID
 * @param clientId - Client ID
 * @param notificationType - Type of notification
 * @param error - Error that caused the failure
 */
export function logNotificationFailed(
  jobName: string,
  loanId: string,
  clientId: string,
  notificationType: string,
  error: unknown
): void {
  logger.error(
    {
      event: 'notification_send_failed',
      jobName,
      loanId,
      clientId,
      notificationType,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      timezone: 'Asia/Bangkok',
    },
    `Failed to send ${notificationType} notification for loan ${loanId}: ${error instanceof Error ? error.message : 'Unknown error'}`
  );
}

/**
 * Log notification skipped due to missing LINE connection
 * 
 * @param jobName - Name of the notification job
 * @param loanId - Loan ID
 * @param clientId - Client ID
 * @param notificationType - Type of notification
 * @param reason - Reason for skipping
 */
export function logNotificationSkipped(
  jobName: string,
  loanId: string,
  clientId: string,
  notificationType: string,
  reason: string
): void {
  logger.warn(
    {
      event: 'notification_skipped',
      jobName,
      loanId,
      clientId,
      notificationType,
      reason,
      timestamp: new Date().toISOString(),
      timezone: 'Asia/Bangkok',
    },
    `Skipped ${notificationType} notification for loan ${loanId}: ${reason}`
  );
}

/**
 * Log duplicate notification prevention
 * 
 * @param jobName - Name of the notification job
 * @param loanId - Loan ID
 * @param notificationType - Type of notification
 * @param billingPeriod - Billing period
 */
export function logDuplicatePrevented(
  jobName: string,
  loanId: string,
  notificationType: string,
  billingPeriod: string
): void {
  logger.info(
    {
      event: 'notification_duplicate_prevented',
      jobName,
      loanId,
      notificationType,
      billingPeriod,
      timestamp: new Date().toISOString(),
      timezone: 'Asia/Bangkok',
    },
    `Duplicate prevented: ${notificationType} notification for loan ${loanId} already sent for period ${billingPeriod}`
  );
}

/**
 * Log cron job trigger with scheduled time
 * 
 * @param jobName - Name of the notification job
 * @param scheduledTime - Time the job was scheduled to run
 */
export function logCronTrigger(jobName: string, scheduledTime: Date): void {
  logger.info(
    {
      event: 'cron_job_triggered',
      jobName,
      scheduledTime: scheduledTime.toISOString(),
      actualTime: new Date().toISOString(),
      timezone: 'Asia/Bangkok',
    },
    `Cron job triggered: ${jobName}`
  );
}

/**
 * Log cron job error with context
 * 
 * @param jobName - Name of the notification job
 * @param error - Error that occurred
 */
export function logCronError(jobName: string, error: unknown): void {
  logger.error(
    {
      event: 'cron_job_error',
      jobName,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      timezone: 'Asia/Bangkok',
    },
    `Cron job error: ${jobName} - ${error instanceof Error ? error.message : 'Unknown error'}`
  );
}
