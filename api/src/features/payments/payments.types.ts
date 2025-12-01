import type { transactions } from "../../core/database/schema/transactions.schema";
import type { loans } from "../../core/database/schema/loans.schema";
import type { clients } from "../../core/database/schema/clients.schema";

/**
 * Request to process a payment for a loan contract
 */
export interface ProcessPaymentRequest {
  transactionRefId: string;
  loanId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod?: string;
  paymentSource?: string;
  notes?: string;
  processedBy?: string;
}

/**
 * Breakdown of how a payment was allocated across debt categories
 */
export interface PaymentAllocation {
  toPenalties: number;
  toInterest: number;
  toPrincipal: number;
  remaining: number; // Should be 0 if fully allocated
}

/**
 * Result of processing a payment
 */
export interface PaymentResult {
  transactionId: string;
  allocation: PaymentAllocation;
  balanceAfter: number;
  principalRemaining: number;
  newStatus: string;
  receiptPath?: string;
}

/**
 * Transaction with related loan and client details
 */
export interface TransactionWithDetails {
  transaction: typeof transactions.$inferSelect;
  loan: typeof loans.$inferSelect;
  client: typeof clients.$inferSelect;
}

/**
 * Data for payment notification via LINE
 */
export interface PaymentNotificationData {
  amount: number;
  allocation: PaymentAllocation;
  balanceAfter: number;
  transactionRefId: string;
  paymentDate: Date;
  contractNumber: string;
}

/**
 * Data for loan closed notification
 */
export interface LoanClosedNotificationData {
  contractNumber: string;
  totalPaid: number;
  finalPaymentDate: Date;
}
