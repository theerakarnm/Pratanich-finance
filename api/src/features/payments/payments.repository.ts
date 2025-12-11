import { eq, desc, sql } from "drizzle-orm";
import { db } from "../../core/database";
import { transactions } from "../../core/database/schema/transactions.schema";
import { loans } from "../../core/database/schema/loans.schema";
import { clients } from "../../core/database/schema/clients.schema";
import type { TransactionWithDetails } from "./payments.types";
import logger from "../../core/logger";

/**
 * Data for inserting a new transaction
 */
export interface TransactionInsert {
  transaction_ref_id: string;
  loan_id: string;
  client_id: string;
  transaction_type: "Payment" | "Disbursement" | "Fee" | "Adjustment";
  transaction_status?: "Pending" | "Completed" | "Failed" | "Reversed";
  payment_date: Date;
  amount: string;
  amount_to_penalties: string;
  amount_to_interest: string;
  amount_to_principal: string;
  balance_after: string;
  principal_remaining: string;
  payment_method?: string;
  payment_source?: string;
  receipt_path?: string;
  notes?: string;
  processed_by?: string;
}

/**
 * Data for updating loan fields during payment processing
 */
export interface LoanUpdates {
  outstanding_balance: string;
  principal_paid: string;
  interest_paid: string;
  penalties_paid: string;
  total_penalties: string;
  last_payment_date: Date;
  last_payment_amount: string;
  contract_status?: "Active" | "Closed" | "Overdue";
  previous_status?: "Active" | "Closed" | "Overdue";
  status_changed_at?: Date;
}

export class PaymentRepository {
  /**
   * Check if transaction reference already exists
   * @param transactionRef - Transaction reference ID to check
   * @returns Transaction if found, null otherwise
   */
  async findByTransactionRef(transactionRef: string): Promise<typeof transactions.$inferSelect | null> {
    logger.info(
      { transactionRef },
      "Checking for duplicate transaction"
    );

    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transaction_ref_id, transactionRef))
      .limit(1);

    const found = result[0] || null;

    if (found) {
      logger.info(
        { transactionRef, transactionId: found.id },
        "Duplicate transaction found"
      );
    } else {
      logger.info(
        { transactionRef },
        "No duplicate transaction found"
      );
    }

    return found;
  }

  /**
   * Process payment in ACID transaction with row locking
   * This method ensures atomicity by wrapping all operations in a database transaction
   * and uses FOR UPDATE to acquire a pessimistic lock on the loan record
   * 
   * @param loanId - ID of the loan to update
   * @param transactionData - Transaction record to insert
   * @param loanUpdates - Loan fields to update
   * @returns Created transaction record
   * @throws Error if transaction fails (will rollback all changes)
   */
  async processPaymentTransaction(
    loanId: string,
    transactionData: TransactionInsert,
    loanUpdates: LoanUpdates
  ): Promise<typeof transactions.$inferSelect> {
    logger.info(
      {
        loanId,
        transactionRefId: transactionData.transaction_ref_id,
        amount: transactionData.amount,
      },
      "Starting ACID transaction for payment processing"
    );

    try {
      const result = await db.transaction(async (tx) => {
        // Step 1: Acquire row-level lock on the loan record
        // FOR UPDATE ensures no other transaction can modify this loan until we commit
        logger.info(
          { loanId },
          "Acquiring row-level lock on loan record"
        );

        const lockedLoan = await tx
          .select()
          .from(loans)
          .where(eq(loans.id, loanId))
          .for("update")
          .limit(1);

        if (!lockedLoan[0]) {
          logger.error({ loanId }, "Loan not found during transaction");
          throw new Error(`Loan ${loanId} not found`);
        }

        logger.info(
          { loanId },
          "Lock acquired successfully"
        );

        // Step 2: Update loan balances and status
        logger.info(
          {
            loanId,
            updates: {
              outstanding_balance: loanUpdates.outstanding_balance,
              principal_paid: loanUpdates.principal_paid,
              interest_paid: loanUpdates.interest_paid,
              penalties_paid: loanUpdates.penalties_paid,
              contract_status: loanUpdates.contract_status,
            },
          },
          "Updating loan balances and status"
        );

        await tx
          .update(loans)
          .set({
            ...loanUpdates,
            updated_at: new Date(),
          })
          .where(eq(loans.id, loanId));

        logger.info(
          { loanId },
          "Loan updated successfully"
        );

        // Step 3: Insert transaction record
        logger.info(
          {
            transactionRefId: transactionData.transaction_ref_id,
            loanId,
            amount: transactionData.amount,
            allocation: {
              toPenalties: transactionData.amount_to_penalties,
              toInterest: transactionData.amount_to_interest,
              toPrincipal: transactionData.amount_to_principal,
            },
          },
          "Inserting transaction record"
        );

        const result = await tx
          .insert(transactions)
          .values(transactionData)
          .returning();

        logger.info(
          {
            transactionId: result[0].id,
            transactionRefId: transactionData.transaction_ref_id,
          },
          "Transaction record inserted successfully"
        );

        return result[0];
      });

      logger.info(
        {
          loanId,
          transactionId: result.id,
          transactionRefId: transactionData.transaction_ref_id,
        },
        "ACID transaction committed successfully"
      );

      return result;
    } catch (error) {
      logger.error(
        {
          loanId,
          transactionRefId: transactionData.transaction_ref_id,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
        "ACID transaction failed - rolling back all changes"
      );
      throw error;
    }
  }

  /**
   * Create transaction record
   * Note: This method does not use a transaction wrapper.
   * Use processPaymentTransaction() for payment processing with ACID guarantees.
   * 
   * @param data - Transaction data to insert
   * @returns Created transaction record
   */
  async createTransaction(data: TransactionInsert): Promise<typeof transactions.$inferSelect> {
    logger.info(
      {
        transactionRefId: data.transaction_ref_id,
        loanId: data.loan_id,
        amount: data.amount,
      },
      "Creating transaction record (without ACID wrapper)"
    );

    const result = await db
      .insert(transactions)
      .values(data)
      .returning();

    logger.info(
      {
        transactionId: result[0].id,
        transactionRefId: data.transaction_ref_id,
      },
      "Transaction record created"
    );

    return result[0];
  }

  /**
   * Get payment history for a loan with pagination
   * @param loanId - ID of the loan
   * @param limit - Maximum number of records to return
   * @param offset - Number of records to skip
   * @returns Array of transactions ordered by payment date descending
   */
  async findPaymentHistory(
    loanId: string,
    limit: number,
    offset: number
  ): Promise<Array<typeof transactions.$inferSelect>> {
    logger.info(
      { loanId, limit, offset },
      "Querying payment history"
    );

    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.loan_id, loanId))
      .orderBy(desc(transactions.payment_date))
      .limit(limit)
      .offset(offset);

    logger.info(
      { loanId, count: result.length, limit, offset },
      "Payment history query completed"
    );

    return result;
  }

  /**
   * Count total payments for a loan
   * @param loanId - ID of the loan
   * @returns Total number of transactions for the loan
   */
  async countPayments(loanId: string): Promise<number> {
    logger.info(
      { loanId },
      "Counting total payments for loan"
    );

    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transactions)
      .where(eq(transactions.loan_id, loanId));

    const count = Number(result[0].count);

    logger.info(
      { loanId, count },
      "Payment count completed"
    );

    return count;
  }

  /**
   * Get transaction by ID with loan and client details
   * @param transactionId - ID of the transaction
   * @returns Transaction with related loan and client data, or null if not found
   */
  async findById(transactionId: string): Promise<TransactionWithDetails | null> {
    logger.info(
      { transactionId },
      "Fetching transaction with details"
    );

    const result = await db
      .select({
        transaction: transactions,
        loan: loans,
        client: clients,
      })
      .from(transactions)
      .leftJoin(loans, eq(transactions.loan_id, loans.id))
      .leftJoin(clients, eq(transactions.client_id, clients.id))
      .where(eq(transactions.id, transactionId))
      .limit(1);

    if (!result[0] || !result[0].loan || !result[0].client) {
      logger.warn(
        { transactionId },
        "Transaction not found or missing related data"
      );
      return null;
    }

    logger.info(
      {
        transactionId,
        loanId: result[0].loan.id,
        clientId: result[0].client.id,
      },
      "Transaction with details fetched successfully"
    );

    return {
      transaction: result[0].transaction,
      loan: result[0].loan,
      client: result[0].client,
    };
  }

  /**
   * Sum of transaction amounts for today
   * @returns Total amount of transactions with payment_date = today
   */
  async sumTodayTransactions(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db
      .select({
        total: sql<string>`COALESCE(SUM(${transactions.amount}::numeric), 0)`,
      })
      .from(transactions)
      .where(
        sql`${transactions.payment_date} >= ${today} AND ${transactions.payment_date} < ${tomorrow}`
      );

    return parseFloat(result[0]?.total || "0");
  }

  /**
   * Count of transactions for today
   * @returns Number of transactions with payment_date = today
   */
  async countTodayTransactions(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(transactions)
      .where(
        sql`${transactions.payment_date} >= ${today} AND ${transactions.payment_date} < ${tomorrow}`
      );

    return result[0]?.count || 0;
  }

  /**
   * Get transaction volume grouped by day for the last 7 days
   * @returns Array of { name: string, value: number } for charting
   */
  async getTransactionVolume(): Promise<Array<{ name: string; value: number }>> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const result = await db
      .select({
        day: sql<string>`TO_CHAR(${transactions.payment_date}, 'Dy')`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(transactions)
      .where(sql`${transactions.payment_date} >= ${sevenDaysAgo}`)
      .groupBy(sql`TO_CHAR(${transactions.payment_date}, 'Dy'), DATE_TRUNC('day', ${transactions.payment_date})`)
      .orderBy(sql`DATE_TRUNC('day', ${transactions.payment_date})`);

    return result.map((row) => ({
      name: row.day,
      value: row.count,
    }));
  }
}

export const paymentRepository = new PaymentRepository();
