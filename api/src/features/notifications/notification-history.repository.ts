import { eq, and } from "drizzle-orm";
import { db } from "../../core/database";
import { notificationHistory } from "../../core/database/schema/notification-history.schema";
import type { NotificationHistoryInsert, NotificationHistory, NotificationType } from "./notification.types";
import logger from "../../core/logger";

/**
 * Repository for notification history operations
 * Handles CRUD operations for notification tracking and duplicate prevention
 */
export class NotificationHistoryRepository {
  /**
   * Create a new notification history record
   * @param record - Notification history data to insert
   * @returns Created notification history record
   */
  async create(record: NotificationHistoryInsert): Promise<NotificationHistory> {
    logger.info(
      {
        loanId: record.loan_id,
        notificationType: record.notification_type,
        billingPeriod: record.billing_period,
        sendStatus: record.send_status,
      },
      "Creating notification history record"
    );

    try {
      const result = await db
        .insert(notificationHistory)
        .values(record)
        .returning();

      logger.info(
        {
          notificationId: result[0].id,
          loanId: record.loan_id,
          notificationType: record.notification_type,
        },
        "Notification history record created successfully"
      );

      return result[0] as NotificationHistory;
    } catch (error) {
      logger.error(
        {
          loanId: record.loan_id,
          notificationType: record.notification_type,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Failed to create notification history record"
      );
      throw error;
    }
  }

  /**
   * Find notification by loan ID, type, and billing period
   * Used for duplicate detection
   * @param loanId - ID of the loan
   * @param notificationType - Type of notification
   * @param billingPeriod - Billing period (YYYY-MM for billing/warning/due_date, YYYY-MM-DD for overdue)
   * @returns Notification history record if found, null otherwise
   */
  async findByLoanAndType(
    loanId: string,
    notificationType: NotificationType,
    billingPeriod: string
  ): Promise<NotificationHistory | null> {
    logger.info(
      {
        loanId,
        notificationType,
        billingPeriod,
      },
      "Checking for existing notification"
    );

    try {
      const result = await db
        .select()
        .from(notificationHistory)
        .where(
          and(
            eq(notificationHistory.loan_id, loanId),
            eq(notificationHistory.notification_type, notificationType),
            eq(notificationHistory.billing_period, billingPeriod)
          )
        )
        .limit(1);

      const found = result[0] || null;

      if (found) {
        logger.info(
          {
            notificationId: found.id,
            loanId,
            notificationType,
            billingPeriod,
            sentAt: found.sent_at,
          },
          "Existing notification found"
        );
      } else {
        logger.info(
          {
            loanId,
            notificationType,
            billingPeriod,
          },
          "No existing notification found"
        );
      }

      return found as NotificationHistory | null;
    } catch (error) {
      logger.error(
        {
          loanId,
          notificationType,
          billingPeriod,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Failed to query notification history"
      );
      throw error;
    }
  }

  /**
   * Find all notifications for a loan
   * Used for audit queries
   * @param loanId - ID of the loan
   * @returns Array of notification history records for the loan
   */
  async findByLoan(loanId: string): Promise<NotificationHistory[]> {
    logger.info(
      { loanId },
      "Querying all notifications for loan"
    );

    try {
      const result = await db
        .select()
        .from(notificationHistory)
        .where(eq(notificationHistory.loan_id, loanId));

      logger.info(
        {
          loanId,
          count: result.length,
        },
        "Notification history query completed"
      );

      return result as NotificationHistory[];
    } catch (error) {
      logger.error(
        {
          loanId,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Failed to query notifications for loan"
      );
      throw error;
    }
  }
}

export const notificationHistoryRepository = new NotificationHistoryRepository();
