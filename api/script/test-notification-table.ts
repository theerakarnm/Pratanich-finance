import { db } from "../src/core/database";
import { notificationHistory } from "../src/core/database/schema/notification-history.schema";
import { clients } from "../src/core/database/schema/clients.schema";
import { loans } from "../src/core/database/schema/loans.schema";
import { logger } from "../src/core/logger";
import { uuidv7 } from "uuidv7";
import { eq, and } from "drizzle-orm";

/**
 * Test notification_history table operations
 * Uses a transaction that gets rolled back to avoid polluting the database
 */
async function testNotificationTable() {
  try {
    logger.info("Testing notification_history table operations...");

    // Use a transaction that we'll rollback
    await db.transaction(async (tx) => {
      // Create test client
      const testClientId = uuidv7();
      await tx.insert(clients).values({
        id: testClientId,
        citizen_id: "1234567890123",
        title_name: "นาย",
        first_name: "Test",
        last_name: "Client",
        date_of_birth: "1990-01-01",
        mobile_number: "0812345678",
        created_at: new Date(),
        updated_at: new Date(),
      });

      logger.info({ testClientId }, "Test client created");

      // Create test loan
      const testLoanId = uuidv7();
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 10);
      
      await tx.insert(loans).values({
        id: testLoanId,
        contract_number: "TEST-" + Date.now(),
        client_id: testClientId,
        loan_type: "Personal",
        principal_amount: "10000.00",
        approved_amount: "10000.00",
        outstanding_balance: "10000.00",
        installment_amount: "1000.00",
        interest_rate: "2.00",
        term_months: 10,
        due_day: 15,
        contract_status: "Active",
        contract_start_date: startDate.toISOString().split('T')[0],
        contract_end_date: endDate.toISOString().split('T')[0],
        created_at: new Date(),
        updated_at: new Date(),
      });

      logger.info({ testLoanId }, "Test loan created");

      // Create a test notification record
      const testRecord = {
        id: uuidv7(),
        loan_id: testLoanId,
        client_id: testClientId,
        line_user_id: "U" + Math.random().toString(36).substring(2, 15),
        notification_type: "billing" as const,
        billing_period: "2025-01",
        sent_at: new Date(),
        send_status: "sent",
        created_at: new Date(),
      };

      logger.info({ testRecord }, "Inserting test notification record...");

      // Insert test record
      const inserted = await tx
        .insert(notificationHistory)
        .values(testRecord)
        .returning();

      logger.info({ inserted: inserted[0] }, "Test record inserted successfully");

      // Query the record back
      const queried = await tx
        .select()
        .from(notificationHistory)
        .where(eq(notificationHistory.id, testRecord.id));

      logger.info({ queried: queried[0] }, "Test record queried successfully");

      // Test duplicate check query (by loan_id, type, and period)
      const duplicateCheck = await tx
        .select()
        .from(notificationHistory)
        .where(
          and(
            eq(notificationHistory.loan_id, testRecord.loan_id),
            eq(notificationHistory.notification_type, testRecord.notification_type),
            eq(notificationHistory.billing_period, testRecord.billing_period)
          )
        );

      logger.info({ 
        duplicateCheckCount: duplicateCheck.length 
      }, "Duplicate check query successful");

      // Test index usage by querying with sent_at
      const sentAtQuery = await tx
        .select()
        .from(notificationHistory)
        .where(eq(notificationHistory.sent_at, testRecord.sent_at));

      logger.info({ 
        sentAtQueryCount: sentAtQuery.length 
      }, "sent_at index query successful");

      // Rollback the transaction to clean up
      logger.info("Rolling back transaction to clean up test data...");
      tx.rollback();
    });

    logger.info("✅ All table operation tests passed!");
    process.exit(0);
  } catch (error: any) {
    // Rollback error is expected
    if (error?.message === "Rollback") {
      logger.info("✅ All table operation tests passed! (Transaction rolled back as expected)");
      process.exit(0);
    }
    
    logger.error({ error }, "Table operation test failed");
    process.exit(1);
  }
}

testNotificationTable();
