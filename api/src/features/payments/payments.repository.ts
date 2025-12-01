import { eq, desc, sql } from "drizzle-orm";
import { db } from "../../core/database";
import { transactions } from "../../core/database/schema/transactions.schema";
import { loans } from "../../core/database/schema/loans.schema";
import { clients } from "../../core/database/schema/clients.schema";
import type { TransactionWithDetails } from "./payments.types";

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
    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.transaction_ref_id, transactionRef))
      .limit(1);

    return result[0] || null;
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
    return await db.transaction(async (tx) => {
      // Step 1: Acquire row-level lock on the loan record
      // FOR UPDATE ensures no other transaction can modify this loan until we commit
      const lockedLoan = await tx
        .select()
        .from(loans)
        .where(eq(loans.id, loanId))
        .for("update")
        .limit(1);

      if (!lockedLoan[0]) {
        throw new Error(`Loan ${loanId} not found`);
      }

      // Step 2: Update loan balances and status
      await tx
        .update(loans)
        .set({
          ...loanUpdates,
          updated_at: new Date(),
        })
        .where(eq(loans.id, loanId));

      // Step 3: Insert transaction record
      const result = await tx
        .insert(transactions)
        .values(transactionData)
        .returning();

      return result[0];
    });
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
    const result = await db
      .insert(transactions)
      .values(data)
      .returning();

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
    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.loan_id, loanId))
      .orderBy(desc(transactions.payment_date))
      .limit(limit)
      .offset(offset);

    return result;
  }

  /**
   * Count total payments for a loan
   * @param loanId - ID of the loan
   * @returns Total number of transactions for the loan
   */
  async countPayments(loanId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(transactions)
      .where(eq(transactions.loan_id, loanId));

    return Number(result[0].count);
  }

  /**
   * Get transaction by ID with loan and client details
   * @param transactionId - ID of the transaction
   * @returns Transaction with related loan and client data, or null if not found
   */
  async findById(transactionId: string): Promise<TransactionWithDetails | null> {
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
      return null;
    }

    return {
      transaction: result[0].transaction,
      loan: result[0].loan,
      client: result[0].client,
    };
  }
}

export const paymentRepository = new PaymentRepository();
