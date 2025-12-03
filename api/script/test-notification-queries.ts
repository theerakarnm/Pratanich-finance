/**
 * Test script to verify notification query methods in LoansRepository
 * Run with: bun run api/script/test-notification-queries.ts
 */

import { loansRepository } from "../src/features/loans/loans.repository";
import { logger } from "../src/core/logger";

async function testNotificationQueries() {
  logger.info("Testing notification query methods...");

  try {
    // Test billing notification query (15 days before due date)
    logger.info("Testing findLoansForBillingNotification...");
    const billingLoans = await loansRepository.findLoansForBillingNotification();
    logger.info({ count: billingLoans.length }, "Billing notification loans found");
    if (billingLoans.length > 0) {
      logger.info({ sample: billingLoans[0] }, "Sample billing loan");
    }

    // Test warning notification query (3 days before due date)
    logger.info("Testing findLoansForWarningNotification...");
    const warningLoans = await loansRepository.findLoansForWarningNotification();
    logger.info({ count: warningLoans.length }, "Warning notification loans found");
    if (warningLoans.length > 0) {
      logger.info({ sample: warningLoans[0] }, "Sample warning loan");
    }

    // Test due date notification query (on due date)
    logger.info("Testing findLoansForDueDateNotification...");
    const dueDateLoans = await loansRepository.findLoansForDueDateNotification();
    logger.info({ count: dueDateLoans.length }, "Due date notification loans found");
    if (dueDateLoans.length > 0) {
      logger.info({ sample: dueDateLoans[0] }, "Sample due date loan");
    }

    // Test overdue notification query (1, 3, or 7 days overdue)
    logger.info("Testing findLoansForOverdueNotification...");
    const overdueLoans = await loansRepository.findLoansForOverdueNotification();
    logger.info({ count: overdueLoans.length }, "Overdue notification loans found");
    if (overdueLoans.length > 0) {
      logger.info({ sample: overdueLoans[0] }, "Sample overdue loan");
    }

    logger.info("All notification query tests completed successfully!");
  } catch (error) {
    logger.error({ error }, "Error testing notification queries");
    throw error;
  }
}

testNotificationQueries()
  .then(() => {
    logger.info("Test script completed");
    process.exit(0);
  })
  .catch((error) => {
    logger.error({ error }, "Test script failed");
    process.exit(1);
  });
