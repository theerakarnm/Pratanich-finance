/**
 * Notification type enum matching database enum
 */
export type NotificationType = 'billing' | 'warning' | 'due_date' | 'overdue';

/**
 * Insert type for notification history records
 */
export interface NotificationHistoryInsert {
  loan_id: string;
  client_id: string;
  line_user_id: string;
  notification_type: NotificationType;
  billing_period: string;
  overdue_days?: number;
  message_data?: string;
  send_status: 'sent' | 'failed';
  error_message?: string;
}

/**
 * Full notification history record with generated fields
 */
export interface NotificationHistory extends NotificationHistoryInsert {
  id: string;
  sent_at: Date;
  created_at: Date;
}

/**
 * Result of a notification job execution
 */
export interface NotificationJobResult {
  jobName: string;
  startTime: Date;
  endTime: Date;
  loansProcessed: number;
  notificationsSent: number;
  notificationsFailed: number;
  errors: Array<{
    loanId: string;
    error: string;
  }>;
}

/**
 * Loan contract with client information for notification processing
 * Result of JOIN query between loans and clients tables
 */
export interface LoanWithClient {
  id: string;
  contract_number: string;
  client_id: string;
  outstanding_balance: string;
  installment_amount: string;
  due_day: number;
  contract_status: 'Active' | 'Closed' | 'Overdue';
  overdue_days: number;
  interest_rate: string;
  term_months: number;
  contract_start_date: string;
  total_penalties: string;
  client_name: string;
  client_phone: string;
}

/**
 * Data for billing notification (15 days before due date)
 */
export interface BillingNotificationData {
  month: string;
  amount: number;
  dueDate: string;
  contractNumber: string;
  paymentLink: string;
}

/**
 * Data for warning notification (3 days before due date)
 */
export interface WarningNotificationData {
  daysRemaining: number;
  amount: number;
  dueDate: string;
  contractNumber: string;
  paymentLink: string;
}

/**
 * Data for due date notification (on due date)
 */
export interface DueDateNotificationData {
  amount: number;
  contractNumber: string;
  paymentLink: string;
}

/**
 * Data for overdue notification (after due date)
 */
export interface OverdueNotificationData {
  daysOverdue: number;
  amount: number;
  contractNumber: string;
  penaltyAmount?: number;
  paymentLink: string;
}
