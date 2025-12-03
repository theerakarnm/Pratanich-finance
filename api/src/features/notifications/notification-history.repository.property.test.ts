import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fc from "fast-check";
import { NotificationHistoryRepository } from "./notification-history.repository";
import { db } from "../../core/database";
import { notificationHistory } from "../../core/database/schema/notification-history.schema";
import { loans } from "../../core/database/schema/loans.schema";
import { clients } from "../../core/database/schema/clients.schema";
import { sql } from "drizzle-orm";
import type { NotificationType } from "./notification.types";

const repository = new NotificationHistoryRepository();

// Helper to clean up test data
async function cleanupTestData() {
  await db.execute(sql`DELETE FROM ${notificationHistory} WHERE loan_id LIKE 'test-%'`);
  await db.execute(sql`DELETE FROM ${loans} WHERE id LIKE 'test-%'`);
  await db.execute(sql`DELETE FROM ${clients} WHERE id LIKE 'test-%'`);
}

// Helper to create test client
async function createTestClient(clientId: string) {
  await db.execute(sql`
    INSERT INTO ${clients} (id, citizen_id, title_name, first_name, last_name, date_of_birth, mobile_number, email)
    VALUES (${clientId}, ${`TEST${clientId.slice(-10)}`}, 'นาย', 'Test', 'Client', '1990-01-01', '0812345678', 'test@example.com')
    ON CONFLICT (id) DO NOTHING
  `);
}

// Helper to create test loan
async function createTestLoan(loanId: string, clientId: string) {
  await db.execute(sql`
    INSERT INTO ${loans} (
      id, contract_number, client_id, loan_type, principal_amount, approved_amount,
      outstanding_balance, installment_amount, interest_rate, term_months, due_day,
      contract_status, contract_start_date, contract_end_date
    )
    VALUES (
      ${loanId}, ${`TEST${loanId.slice(-10)}`}, ${clientId}, 'Personal', '100000.00', '100000.00',
      '100000.00', '10000.00', '0.15', 12, 15,
      'Active', '2024-01-01', '2024-12-31'
    )
    ON CONFLICT (id) DO NOTHING
  `);
}

describe("Notification History Repository - Property-Based Tests", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  /**
   * Feature: payment-notification-scheduler, Property 5: Duplicate notification prevention
   * Validates: Requirements 1.3, 2.3, 3.3, 4.3, 6.1, 6.2, 6.3
   * 
   * For any loan and notification type, if a notification has already been sent for the
   * current billing period (or overdue milestone), then no additional notification of that
   * type should be sent for that period. This property verifies that the repository correctly
   * detects existing notifications to prevent duplicates.
   */
  test("Property 5: Duplicate notification prevention", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate notification type
        fc.constantFrom<NotificationType>("billing", "warning", "due_date", "overdue"),
        // Generate billing period (YYYY-MM format for most, YYYY-MM-DD for overdue)
        fc.oneof(
          fc.date({ min: new Date("2024-01-01"), max: new Date("2025-12-31") }).map(d => 
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          ),
          fc.date({ min: new Date("2024-01-01"), max: new Date("2025-12-31") }).map(d => 
            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          )
        ),
        // Generate overdue days (for overdue notifications)
        fc.constantFrom(1, 3, 7),
        // Generate send status
        fc.constantFrom<"sent" | "failed">("sent", "failed"),
        async (notificationType, billingPeriod, overdueDays, sendStatus) => {
          // Create unique test IDs for this test case
          const testId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
          const clientId = `${testId}-client`;
          const loanId = `${testId}-loan`;
          const lineUserId = `U${testId.slice(-20)}`;

          // Setup: Create test client and loan
          await createTestClient(clientId);
          await createTestLoan(loanId, clientId);

          // Property: Before creating a notification, findByLoanAndType should return null
          const beforeCreate = await repository.findByLoanAndType(
            loanId,
            notificationType,
            billingPeriod
          );
          expect(beforeCreate).toBeNull();

          // Create first notification
          const firstNotification = await repository.create({
            loan_id: loanId,
            client_id: clientId,
            line_user_id: lineUserId,
            notification_type: notificationType,
            billing_period: billingPeriod,
            overdue_days: notificationType === "overdue" ? overdueDays : undefined,
            send_status: sendStatus,
            message_data: "Test notification",
          });

          // Property: After creating a notification, findByLoanAndType should return it
          const afterCreate = await repository.findByLoanAndType(
            loanId,
            notificationType,
            billingPeriod
          );
          expect(afterCreate).not.toBeNull();
          expect(afterCreate?.id).toBe(firstNotification.id);
          expect(afterCreate?.loan_id).toBe(loanId);
          expect(afterCreate?.notification_type).toBe(notificationType);
          expect(afterCreate?.billing_period).toBe(billingPeriod);

          // Property: Attempting to find the same notification again should return the same record
          const duplicate = await repository.findByLoanAndType(
            loanId,
            notificationType,
            billingPeriod
          );
          expect(duplicate).not.toBeNull();
          expect(duplicate?.id).toBe(firstNotification.id);

          // Property: Different billing period should not be found
          const differentPeriod = billingPeriod === "2024-01" ? "2024-02" : "2024-01";
          const notFoundDifferentPeriod = await repository.findByLoanAndType(
            loanId,
            notificationType,
            differentPeriod
          );
          expect(notFoundDifferentPeriod).toBeNull();

          // Property: Different notification type should not be found
          const differentTypes: NotificationType[] = ["billing", "warning", "due_date", "overdue"];
          const differentType = differentTypes.find(t => t !== notificationType) || "billing";
          const notFoundDifferentType = await repository.findByLoanAndType(
            loanId,
            differentType,
            billingPeriod
          );
          expect(notFoundDifferentType).toBeNull();

          // Property: findByLoan should return all notifications for the loan
          const allNotifications = await repository.findByLoan(loanId);
          expect(allNotifications.length).toBeGreaterThanOrEqual(1);
          expect(allNotifications.some(n => n.id === firstNotification.id)).toBe(true);

          // Cleanup for this specific test case
          await db.execute(sql`DELETE FROM ${notificationHistory} WHERE loan_id = ${loanId}`);
          await db.execute(sql`DELETE FROM ${loans} WHERE id = ${loanId}`);
          await db.execute(sql`DELETE FROM ${clients} WHERE id = ${clientId}`);
        }
      ),
      { numRuns: 100 }
    );
  });
});
