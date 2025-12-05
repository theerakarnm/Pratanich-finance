import type { FlexMessage } from '../line/line.types';
import {
  createBillingMessage,
  createDueWarningMessage,
  createDueDateMessage,
  createOverdueMessage,
} from '../line/utils/flex-message.templates';
import type {
  BillingData,
  DueWarningData,
  DueDateData,
  OverdueData,
} from '../line/utils/flex-message.templates';
import type {
  BillingNotificationData,
  WarningNotificationData,
  DueDateNotificationData,
  OverdueNotificationData,
} from './notification.types';
import { config } from '../../core/config';

/**
 * Service for generating notification Flex Messages
 * Maps notification data to Flex Message templates
 */
export class NotificationService {
  private liffUrl: string | null;

  constructor(liffUrl?: string) {
    this.liffUrl = liffUrl || null;
  }

  /**
   * Create billing notification Flex Message (15 days before due date)
   * Uses createBillingMessage template
   * 
   * @param data - Billing notification data
   * @returns FlexMessage for billing notification
   */
  createBillingNotification(data: BillingNotificationData): FlexMessage {
    const templateData: BillingData = {
      month: data.month,
      amount: data.amount,
      dueDate: data.dueDate,
      contractNumber: data.contractNumber,
      paymentLink: data.paymentLink,
    };

    return createBillingMessage(templateData);
  }

  /**
   * Create warning notification Flex Message (3 days before due date)
   * Uses createDueWarningMessage template
   * 
   * @param data - Warning notification data
   * @returns FlexMessage for warning notification
   */
  createWarningNotification(data: WarningNotificationData): FlexMessage {
    const templateData: DueWarningData = {
      daysRemaining: data.daysRemaining,
      amount: data.amount,
      dueDate: data.dueDate,
      contractNumber: data.contractNumber,
      paymentLink: data.paymentLink,
    };

    return createDueWarningMessage(templateData);
  }

  /**
   * Create due date notification Flex Message (on due date)
   * Uses createDueDateMessage template
   * 
   * @param data - Due date notification data
   * @returns FlexMessage for due date notification
   */
  createDueDateNotification(data: DueDateNotificationData): FlexMessage {
    const templateData: DueDateData = {
      amount: data.amount,
      contractNumber: data.contractNumber,
      paymentLink: data.paymentLink,
    };

    return createDueDateMessage(templateData);
  }

  /**
   * Create overdue notification Flex Message (after due date)
   * Uses createOverdueMessage template
   * 
   * @param data - Overdue notification data
   * @returns FlexMessage for overdue notification
   */
  createOverdueNotification(data: OverdueNotificationData): FlexMessage {
    const templateData: OverdueData = {
      daysOverdue: data.daysOverdue,
      amount: data.amount,
      contractNumber: data.contractNumber,
      penaltyAmount: data.penaltyAmount,
      paymentLink: data.paymentLink,
    };

    return createOverdueMessage(templateData);
  }

  /**
   * Generate payment link with LIFF URL and loan ID parameter
   * Falls back to placeholder URL if LIFF URL is not configured
   * 
   * @param loanId - Loan contract ID
   * @returns Payment link URL with loan ID parameter
   */
  generatePaymentLink(loanId: string): string {
    if (!this.liffUrl) {
      // Fallback URL when LIFF URL is not configured
      return `https://example.com/payment?loanId=${encodeURIComponent(loanId)}`;
    }

    // Encode loan ID to ensure URL safety
    const encodedLoanId = encodeURIComponent(loanId);
    
    // Append loan ID as query parameter to LIFF URL
    const separator = this.liffUrl.includes('?') ? '&' : '?';
    return `${this.liffUrl}${separator}loanId=${encodedLoanId}`;
  }
}

/**
 * Create singleton instance with LIFF URL from config
 */
export const notificationService = new NotificationService(
  config.notification.liffUrl
);
