import type { LoansRepository } from '../loans/loans.repository';
import type { NotificationHistoryRepository } from './notification-history.repository';
import type { ConnectRepository } from '../connect/connect.repository';
import type { NotificationService } from './notification.service';
import type { LineMessagingClient } from '../line/line.client';
import type {
  NotificationJobResult,
  LoanWithClient,
  NotificationType,
  BillingNotificationData,
  WarningNotificationData,
  DueDateNotificationData,
  OverdueNotificationData,
} from './notification.types';
import logger from '../../core/logger';
import {
  logJobStart,
  logJobResult,
  logJobFailure,
  logLoansIdentified,
  logNotificationSent,
  logNotificationFailed,
  logNotificationSkipped,
  logDuplicatePrevented,
} from './notification-logging.utils';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Domain class for notification scheduler
 * Orchestrates the notification sending workflow
 * Handles loan identification, duplicate checking, message generation, and delivery
 */
export class NotificationSchedulerDomain {
  constructor(
    private loansRepository: LoansRepository,
    private notificationHistoryRepository: NotificationHistoryRepository,
    private connectRepository: ConnectRepository,
    private notificationService: NotificationService,
    private lineClient: LineMessagingClient,
    private isTesting: boolean = false
  ) { }

  /**
   * Send billing notifications (15 days before due date)
   * Identifies loans with due dates 15 days in the future
   * Filters for Active or Overdue status
   * 
   * @returns NotificationJobResult with execution summary
   */
  async sendBillingNotifications(): Promise<NotificationJobResult> {
    const startTime = new Date();
    const jobName = 'billing_notifications';

    logJobStart(jobName);

    const result: NotificationJobResult = {
      jobName,
      startTime,
      endTime: new Date(),
      loansProcessed: 0,
      notificationsSent: 0,
      notificationsFailed: 0,
      errors: [],
    };

    try {
      // Identify loans requiring billing notifications
      const loans = await this.loansRepository.findLoansForBillingNotification();

      logLoansIdentified(jobName, loans.length, {
        daysBeforeDue: 15,
        statusFilter: ['Active', 'Overdue'],
      });

      // Process each loan
      for (const loan of loans) {
        result.loansProcessed++;

        try {
          await this.processLoanNotification(loan, 'billing');
          result.notificationsSent++;
        } catch (error) {
          result.notificationsFailed++;
          result.errors.push({
            loanId: loan.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          logNotificationFailed(
            jobName,
            loan.id,
            loan.client_id,
            'billing',
            error
          );
        }
      }

      result.endTime = new Date();
      logJobResult(result);

      return result;
    } catch (error) {
      result.endTime = new Date();
      logJobFailure(jobName, startTime, error);
      throw error;
    }
  }

  /**
   * Send warning notifications (3 days before due date)
   * Identifies loans with due dates 3 days in the future
   * Filters for Active or Overdue status and outstanding balance > 0
   * 
   * @returns NotificationJobResult with execution summary
   */
  async sendWarningNotifications(): Promise<NotificationJobResult> {
    const startTime = new Date();
    const jobName = 'warning_notifications';

    logJobStart(jobName);

    const result: NotificationJobResult = {
      jobName,
      startTime,
      endTime: new Date(),
      loansProcessed: 0,
      notificationsSent: 0,
      notificationsFailed: 0,
      errors: [],
    };

    try {
      // Identify loans requiring warning notifications
      const loans = await this.loansRepository.findLoansForWarningNotification();

      logLoansIdentified(jobName, loans.length, {
        daysBeforeDue: 3,
        statusFilter: ['Active', 'Overdue'],
        balanceFilter: '> 0',
      });

      // Process each loan
      for (const loan of loans) {
        result.loansProcessed++;

        try {
          await this.processLoanNotification(loan, 'warning');
          result.notificationsSent++;
        } catch (error) {
          result.notificationsFailed++;
          result.errors.push({
            loanId: loan.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          logNotificationFailed(
            jobName,
            loan.id,
            loan.client_id,
            'warning',
            error
          );
        }
      }

      result.endTime = new Date();
      logJobResult(result);

      return result;
    } catch (error) {
      result.endTime = new Date();
      logJobFailure(jobName, startTime, error);
      throw error;
    }
  }

  /**
   * Send due date notifications (on due date)
   * Identifies loans with due dates matching current date
   * Filters for Active or Overdue status and outstanding balance > 0
   * 
   * @returns NotificationJobResult with execution summary
   */
  async sendDueDateNotifications(): Promise<NotificationJobResult> {
    const startTime = new Date();
    const jobName = 'due_date_notifications';

    logJobStart(jobName);

    const result: NotificationJobResult = {
      jobName,
      startTime,
      endTime: new Date(),
      loansProcessed: 0,
      notificationsSent: 0,
      notificationsFailed: 0,
      errors: [],
    };

    try {
      // Identify loans requiring due date notifications
      const loans = await this.loansRepository.findLoansForDueDateNotification();

      logLoansIdentified(jobName, loans.length, {
        dueDate: 'today',
        statusFilter: ['Active', 'Overdue'],
        balanceFilter: '> 0',
      });

      // Process each loan
      for (const loan of loans) {
        result.loansProcessed++;

        try {
          await this.processLoanNotification(loan, 'due_date');
          result.notificationsSent++;
        } catch (error) {
          result.notificationsFailed++;
          result.errors.push({
            loanId: loan.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          logNotificationFailed(
            jobName,
            loan.id,
            loan.client_id,
            'due_date',
            error
          );
        }
      }

      result.endTime = new Date();
      logJobResult(result);

      return result;
    } catch (error) {
      result.endTime = new Date();
      logJobFailure(jobName, startTime, error);
      throw error;
    }
  }

  /**
   * Send overdue notifications (after due date)
   * Identifies loans with Overdue status and days overdue equal to 1, 3, or 7
   * 
   * @returns NotificationJobResult with execution summary
   */
  async sendOverdueNotifications(): Promise<NotificationJobResult> {
    const startTime = new Date();
    const jobName = 'overdue_notifications';

    logJobStart(jobName);

    const result: NotificationJobResult = {
      jobName,
      startTime,
      endTime: new Date(),
      loansProcessed: 0,
      notificationsSent: 0,
      notificationsFailed: 0,
      errors: [],
    };

    try {
      // Identify loans requiring overdue notifications
      const loans = await this.loansRepository.findLoansForOverdueNotification();

      logLoansIdentified(jobName, loans.length, {
        statusFilter: ['Overdue'],
        overdueDays: [1, 3, 7],
      });

      // Process each loan
      for (const loan of loans) {
        result.loansProcessed++;

        try {
          await this.processLoanNotification(loan, 'overdue');
          result.notificationsSent++;
        } catch (error) {
          result.notificationsFailed++;
          result.errors.push({
            loanId: loan.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          logNotificationFailed(
            jobName,
            loan.id,
            loan.client_id,
            'overdue',
            error
          );
        }
      }

      result.endTime = new Date();
      logJobResult(result);

      return result;
    } catch (error) {
      result.endTime = new Date();
      logJobFailure(jobName, startTime, error);
      throw error;
    }
  }

  /**
   * Process notification for a single loan
   * Handles LINE user ID lookup, duplicate checking, message generation, and delivery
   * Records notification history on success
   * 
   * @param loan - Loan with client information
   * @param notificationType - Type of notification to send
   * @throws Error if notification fails
   */
  private async processLoanNotification(
    loan: LoanWithClient,
    notificationType: NotificationType
  ): Promise<void> {
    logger.info(
      {
        event: 'processing_loan_notification',
        loanId: loan.id,
        clientId: loan.client_id,
        notificationType,
        contractNumber: loan.contract_number,
      },
      'Processing loan notification'
    );

    // Get LINE user ID
    const lineUserId = await this.getLineUserId(loan.client_id);

    if (!lineUserId) {
      logNotificationSkipped(
        notificationType + '_notifications',
        loan.id,
        loan.client_id,
        notificationType,
        'No LINE user ID found for client'
      );
      throw new Error('No LINE user ID found for client');
    }

    // Calculate billing period for duplicate checking
    const today = dayjs().tz('Asia/Bangkok');
    let billingPeriod: string;
    let overdueDays: number | undefined;

    if (notificationType === 'overdue') {
      // For overdue: use YYYY-MM-DD format with overdue days
      billingPeriod = today.format('YYYY-MM-DD');
      overdueDays = loan.overdue_days;
    } else {
      // For billing/warning/due_date: use YYYY-MM format
      billingPeriod = today.format('YYYY-MM');
    }

    // Check if notification should be sent (duplicate prevention)
    const shouldSend = await this.shouldSendNotification(
      loan.id,
      notificationType,
      billingPeriod
    );

    if (!shouldSend) {
      logDuplicatePrevented(
        notificationType + '_notifications',
        loan.id,
        notificationType,
        billingPeriod
      );
      throw new Error('Notification already sent for this period');
    }

    // Generate notification message
    const paymentLink = this.notificationService.generatePaymentLink(loan.id);
    const installmentAmount = parseFloat(loan.installment_amount);

    let flexMessage;

    switch (notificationType) {
      case 'billing': {
        const data: BillingNotificationData = {
          month: today.format('MMMM YYYY'),
          amount: installmentAmount,
          dueDate: today.add(15, 'days').format('DD/MM/YYYY'),
          contractNumber: loan.contract_number,
          paymentLink,
        };
        flexMessage = this.notificationService.createBillingNotification(data);
        break;
      }

      case 'warning': {
        const data: WarningNotificationData = {
          daysRemaining: 3,
          amount: installmentAmount,
          dueDate: today.add(3, 'days').format('DD/MM/YYYY'),
          contractNumber: loan.contract_number,
          paymentLink,
        };
        flexMessage = this.notificationService.createWarningNotification(data);
        break;
      }

      case 'due_date': {
        const data: DueDateNotificationData = {
          amount: installmentAmount,
          contractNumber: loan.contract_number,
          paymentLink,
        };
        flexMessage = this.notificationService.createDueDateNotification(data);
        break;
      }

      case 'overdue': {
        const penaltyAmount = parseFloat(loan.total_penalties);
        const data: OverdueNotificationData = {
          daysOverdue: loan.overdue_days,
          amount: installmentAmount,
          contractNumber: loan.contract_number,
          penaltyAmount: penaltyAmount > 0 ? penaltyAmount : undefined,
          paymentLink,
        };
        flexMessage = this.notificationService.createOverdueNotification(data);
        break;
      }
    }

    // Send notification via LINE
    // Wrap FlexMessage in LineReplyMessage format
    const lineMessage = {
      type: 'flex' as const,
      altText: `Payment notification for contract ${loan.contract_number}`,
      contents: flexMessage,
    };

    try {
      await this.lineClient.pushMessage(lineUserId, [lineMessage]);

      logNotificationSent(
        notificationType + '_notifications',
        loan.id,
        loan.client_id,
        lineUserId,
        notificationType,
        billingPeriod
      );

      // Record notification history
      await this.notificationHistoryRepository.create({
        loan_id: loan.id,
        client_id: loan.client_id,
        line_user_id: lineUserId,
        notification_type: notificationType,
        billing_period: billingPeriod,
        overdue_days: overdueDays,
        message_data: JSON.stringify(flexMessage),
        send_status: 'sent',
      });

      logger.info(
        {
          event: 'notification_history_recorded',
          loanId: loan.id,
          notificationType,
          billingPeriod,
        },
        'Notification history recorded'
      );
    } catch (error) {
      logger.error(
        {
          event: 'line_api_error',
          loanId: loan.id,
          clientId: loan.client_id,
          lineUserId,
          notificationType,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Failed to send notification via LINE API'
      );

      throw error;
    }
  }

  /**
   * Get LINE user ID for a client
   * Looks up active LINE connection from connect codes table
   * 
   * @param clientId - Client ID
   * @returns LINE user ID or null if not found
   */
  private async getLineUserId(clientId: string): Promise<string | null> {
    try {
      const lineUserId = await this.connectRepository.findActiveLineUserIdByClientId(clientId);

      if (lineUserId) {
        logger.info(
          {
            event: 'line_user_id_found',
            clientId,
            lineUserId,
          },
          'LINE user ID found for client'
        );
      } else {
        logger.warn(
          {
            event: 'line_user_id_not_found',
            clientId,
          },
          'No active LINE connection found for client'
        );
      }

      return lineUserId;
    } catch (error) {
      logger.error(
        {
          event: 'line_user_id_lookup_error',
          clientId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Error looking up LINE user ID'
      );

      throw error;
    }
  }

  /**
   * Check if notification should be sent (duplicate prevention)
   * Queries notification history for existing notification
   * 
   * @param loanId - Loan ID
   * @param notificationType - Type of notification
   * @param billingPeriod - Billing period (YYYY-MM or YYYY-MM-DD)
   * @returns true if notification should be sent, false if already sent
   */
  private async shouldSendNotification(
    loanId: string,
    notificationType: NotificationType,
    billingPeriod: string
  ): Promise<boolean> {
    try {
      const existing = await this.notificationHistoryRepository.findByLoanAndType(
        loanId,
        notificationType,
        billingPeriod
      );

      return existing === null;
    } catch (error) {
      logger.error(
        {
          event: 'duplicate_check_error',
          loanId,
          notificationType,
          billingPeriod,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Error checking for duplicate notification'
      );

      throw error;
    }
  }
}


/**
 * Singleton instance of NotificationSchedulerDomain
 * Initialized with all required dependencies
 */
import { loansRepository } from '../loans/loans.repository';
import { notificationHistoryRepository } from './notification-history.repository';
import { connectRepository } from '../connect/connect.repository';
import { notificationService } from './notification.service';
import { lineClient } from '../line/line.service';

export const notificationSchedulerDomain = new NotificationSchedulerDomain(
  loansRepository,
  notificationHistoryRepository,
  connectRepository,
  notificationService,
  lineClient
);

