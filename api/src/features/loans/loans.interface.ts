import { z } from "zod";

/**
 * Interface for a single payment period in the payment history
 * Represents an actual payment transaction made by the user
 */
export interface PaymentPeriod {
  /** Period number (1-indexed, based on transaction order) */
  periodNumber: number;
  /** Actual payment date */
  paymentDate: string;
  /** Balance at the beginning of this period (before payment) */
  beginningBalance: number;
  /** Total amount paid in this transaction */
  scheduledPayment: number;
  /** Principal portion of the payment */
  principalPayment: number;
  /** Interest portion of the payment */
  interestPayment: number;
  /** Balance at the end of this period (after payment) */
  endingBalance: number;
  /** Accumulated interest paid up to this period */
  accumulatedInterest: number;
  /** Whether this period has been paid - always true for history */
  isPaid: boolean;
  /** Status of the period - always 'paid' for history */
  status: 'paid' | 'current' | 'upcoming';
  /** Penalty portion of the payment */
  penaltyPayment?: number;
  /** Payment method used (e.g., 'Bank Transfer', 'Cash', 'PromptPay') */
  paymentMethod?: string;
  /** Transaction reference ID */
  transactionRef?: string;
}

/**
 * Interface for the complete payment schedule response
 */
export interface PaymentScheduleResponse {
  /** Loan details */
  loanDetails: {
    id: string;
    contractNumber: string;
    clientName: string;
    loanType: string;
    principalAmount: number;
    approvedAmount: number;
    interestRate: number;
    termMonths: number;
    installmentAmount: number;
    contractStartDate: string;
    contractEndDate: string;
    dueDay: number;
    contractStatus: string;
    outstandingBalance: number;
    principalPaid: number;
    interestPaid: number;
    totalPenalties: number;
    penaltiesPaid: number;
    overduedays: number;
    collectionFee: number;
  };
  /** Summary calculations */
  summary: {
    totalPaymentAmount: number;
    totalInterest: number;
    totalPrincipal: number;
    remainingPayments: number;
    completedPayments: number;
  };
  /** Payment schedule periods */
  schedule: PaymentPeriod[];
}

/**
 * Create loan request schema
 */
export const createLoanSchema = z.object({
  contract_number: z.string().min(1, "Contract number is required"),
  client_id: z.string().uuid("Invalid client ID"),
  loan_type: z.string().min(1, "Loan type is required"),
  principal_amount: z.number().positive("Principal amount must be positive"),
  approved_amount: z.number().positive("Approved amount must be positive"),
  interest_rate: z.number().min(0, "Interest rate cannot be negative"),
  term_months: z.number().int().positive("Term must be a positive integer"),
  installment_amount: z.number().positive("Installment amount must be positive"),
  contract_start_date: z.string(),
  contract_end_date: z.string(),
  due_day: z.number().int().min(1).max(31, "Due day must be between 1 and 31"),
  contract_status: z.enum(["Active", "Closed", "Overdue"]),
  outstanding_balance: z.number().min(0, "Outstanding balance cannot be negative"),
  overdue_days: z.number().int().min(0).default(0),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
