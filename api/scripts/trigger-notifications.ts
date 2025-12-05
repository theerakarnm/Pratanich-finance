
/**
 * Singleton instance of NotificationSchedulerDomain
 * Initialized with all required dependencies
 */
import logger from '../src/core/logger';
import { connectRepository } from '../src/features/connect';
import { lineClient } from '../src/features/line/line.service';
import { loansRepository } from '../src/features/loans/loans.repository';
import { notificationHistoryRepository } from '../src/features/notifications/notification-history.repository';
import { NotificationSchedulerDomain } from '../src/features/notifications/notification-scheduler.domain';
import { notificationService } from '../src/features/notifications/notification.service';

async function main() {
  logger.info('Starting manual notification trigger...');

  const notificationSchedulerDomain = new NotificationSchedulerDomain(
    loansRepository,
    notificationHistoryRepository,
    connectRepository,
    notificationService,
    lineClient,
    true
  );

  try {
    logger.info('--- Triggering Billing Notifications ---');
    const billingResult = await notificationSchedulerDomain.sendBillingNotifications();
    logger.info({ result: billingResult }, 'Billing notifications completed');
  } catch (error) {
    logger.error({ error }, 'Failed to send billing notifications');
  }

  try {
    logger.info('--- Triggering Warning Notifications ---');
    const warningResult = await notificationSchedulerDomain.sendWarningNotifications();
    logger.info({ result: warningResult }, 'Warning notifications completed');
  } catch (error) {
    logger.error({ error }, 'Failed to send warning notifications');
  }

  try {
    logger.info('--- Triggering Due Date Notifications ---');
    const dueDateResult = await notificationSchedulerDomain.sendDueDateNotifications();
    logger.info({ result: dueDateResult }, 'Due date notifications completed');
  } catch (error) {
    logger.error({ error }, 'Failed to send due date notifications');
  }

  try {
    logger.info('--- Triggering Overdue Notifications ---');
    const overdueResult = await notificationSchedulerDomain.sendOverdueNotifications();
    logger.info({ result: overdueResult }, 'Overdue notifications completed');
  } catch (error) {
    logger.error({ error }, 'Failed to send overdue notifications');
  }

  logger.info('Manual notification trigger finished.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Unhandled error in manual trigger script:', error);
  process.exit(1);
});
