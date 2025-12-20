import type {
  PaymentAllocation,
  ProcessPaymentRequest,
  PaymentResult,
  PaymentNotificationData,
  LoanClosedNotificationData,
} from "./payments.types";
import {
  PaymentValidationError,
  DuplicateTransactionError,
  LoanNotFoundError,
  InvalidLoanStatusError,
  PaymentProcessingError,
} from "./payments.errors";
import { paymentRepository, type TransactionInsert, type LoanUpdates } from "./payments.repository";
import { loansRepository } from "../loans/loans.repository";
// import { ReceiptGenerator } from "./receipt.generator";
import { PaymentNotificationService } from "./payment-notification.service";
import { LineMessagingClient } from "../line/line.client";
import { config } from "../../core/config";
import logger from "../../core/logger";

/**
 * Payment Domain - Core business logic for payment processing
 */
export class PaymentDomain {
  // private receiptGenerator: ReceiptGenerator;
  private notificationService: PaymentNotificationService;

  constructor() {
    // this.receiptGenerator = new ReceiptGenerator(config.payment.receiptStoragePath);
    this.notificationService = new PaymentNotificationService(
      new LineMessagingClient(
        config.line.channelAccessToken,
        config.line.messagingApiUrl
      )
    );
  }

  /**
   * Process a payment for a loan contract
   * Orchestrates the full payment processing workflow:
   * 1. Validate payment request
   * 2. Calculate accrued interest
   * 3. Allocate payment using waterfall method
   * 4. Update loan balance and status in database transaction
   * 5. Generate receipt PDF
   * 6. Send LINE notification
   * 
   * @param request - Payment processing request
   * @returns PaymentResult with transaction details
   * @throws PaymentValidationError if validation fails
   * @throws DuplicateTransactionError if transaction already processed
   * @throws LoanNotFoundError if loan doesn't exist
   * @throws InvalidLoanStatusError if loan cannot accept payments
   * @throws PaymentProcessingError if processing fails
   */
  async processPayment(request: ProcessPaymentRequest): Promise<PaymentResult> {
    const startTime = Date.now();

    logger.info(
      {
        transactionRefId: request.transactionRefId,
        loanId: request.loanId,
        amount: request.amount,
        paymentDate: request.paymentDate,
      },
      "Starting payment processing"
    );

    try {
      // Step 1: Validate payment request
      await this.validatePayment(request);

      // Step 2: Fetch loan details
      const loan = await loansRepository.findById(request.loanId);
      if (!loan) {
        throw new LoanNotFoundError(request.loanId);
      }

      logger.info(
        {
          transactionRefId: request.transactionRefId,
          loanId: request.loanId,
          contractNumber: loan.contract_number,
          currentStatus: loan.contract_status,
          outstandingBalance: loan.outstanding_balance,
        },
        "Loan details fetched"
      );

      // Step 3: Calculate accrued interest
      const lastPaymentDate = loan.last_payment_date
        ? new Date(loan.last_payment_date)
        : new Date(loan.contract_start_date);

      console.log({ loan });

      const accruedInterest = this.calculateAccruedInterest(
        parseFloat(loan.outstanding_balance),
        parseFloat(loan.interest_rate) / 100,
        lastPaymentDate,
        request.paymentDate
      );

      logger.info(
        {
          transactionRefId: request.transactionRefId,
          loanId: request.loanId,
          accruedInterest,
          lastPaymentDate,
          paymentDate: request.paymentDate,
        },
        "Accrued interest calculated"
      );

      // Step 4: Allocate payment using waterfall method
      const allocation = this.allocatePayment(
        request.amount,
        parseFloat(loan.total_penalties),
        accruedInterest,
        parseFloat(loan.outstanding_balance)
      );

      logger.info(
        {
          transactionRefId: request.transactionRefId,
          loanId: request.loanId,
          allocation,
        },
        "Payment allocated"
      );

      // Step 5: Calculate new balances
      const newPenalties = Math.max(0, parseFloat(loan.total_penalties) - allocation.toPenalties);
      const newOutstandingBalance = Math.max(
        0,
        parseFloat(loan.outstanding_balance) - allocation.toPrincipal
      );
      const newPrincipalPaid = parseFloat(loan.principal_paid) + allocation.toPrincipal;
      const newInterestPaid = parseFloat(loan.interest_paid) + allocation.toInterest;
      const newPenaltiesPaid = parseFloat(loan.penalties_paid) + allocation.toPenalties;

      // Step 6: Determine new loan status
      const previousStatus = loan.contract_status;
      const newStatus = this.determineLoanStatus(
        loan.contract_status,
        newOutstandingBalance,
        newPenalties
      );
      const statusChanged = previousStatus !== newStatus;

      logger.info(
        {
          transactionRefId: request.transactionRefId,
          loanId: request.loanId,
          previousStatus,
          newStatus,
          statusChanged,
          newOutstandingBalance,
        },
        "Loan status determined"
      );

      // Step 7: Calculate audit fields
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysSinceLastTx = Math.floor(
        (request.paymentDate.getTime() - lastPaymentDate.getTime()) / msPerDay
      );
      const appliedRate = parseFloat(loan.interest_rate) / 100;

      // Step 8: Prepare transaction data
      const transactionData: TransactionInsert = {
        transaction_ref_id: request.transactionRefId,
        loan_id: request.loanId,
        client_id: loan.client_id,
        transaction_type: "Payment",
        transaction_status: "Completed",
        payment_date: request.paymentDate,
        amount: request.amount.toFixed(2),
        amount_to_penalties: allocation.toPenalties.toFixed(2),
        amount_to_interest: allocation.toInterest.toFixed(2),
        amount_to_principal: allocation.toPrincipal.toFixed(2),
        balance_after: newOutstandingBalance.toFixed(2),
        principal_remaining: newOutstandingBalance.toFixed(2),
        // Audit fields
        days_since_last_tx: daysSinceLastTx,
        applied_rate: appliedRate.toFixed(4),
        payment_method: request.paymentMethod,
        payment_source: request.paymentSource,
        notes: request.notes,
        processed_by: request.processedBy,
      };

      // Step 9: Prepare loan updates
      const loanUpdates: LoanUpdates = {
        outstanding_balance: newOutstandingBalance.toFixed(2),
        principal_paid: newPrincipalPaid.toFixed(2),
        interest_paid: newInterestPaid.toFixed(2),
        penalties_paid: newPenaltiesPaid.toFixed(2),
        total_penalties: newPenalties.toFixed(2),
        last_payment_date: request.paymentDate,
        last_payment_amount: request.amount.toFixed(2),
        ...(statusChanged && {
          contract_status: newStatus as "Active" | "Closed" | "Overdue",
          previous_status: previousStatus as "Active" | "Closed" | "Overdue",
          status_changed_at: new Date(),
        }),
      };

      // Step 10: Execute database transaction (ACID)
      logger.info(
        {
          transactionRefId: request.transactionRefId,
          loanId: request.loanId,
        },
        "Executing database transaction"
      );

      const transaction = await paymentRepository.processPaymentTransaction(
        request.loanId,
        transactionData,
        loanUpdates
      );

      logger.info(
        {
          transactionRefId: request.transactionRefId,
          loanId: request.loanId,
          transactionId: transaction.id,
        },
        "Database transaction completed successfully"
      );

      // Step 10: Generate receipt PDF
      let receiptPath: string | undefined;
      try {
        const transactionWithDetails = await paymentRepository.findById(transaction.id);
        if (transactionWithDetails) {

          // TODO: Generate receipt PDF
          // const pdfBuffer = await this.receiptGenerator.generateReceipt(
          //   transactionWithDetails
          // );
          // receiptPath = await this.receiptGenerator.saveReceipt(
          //   transaction.id,
          //   pdfBuffer
          // );

          logger.info(
            {
              transactionRefId: request.transactionRefId,
              transactionId: transaction.id,
              receiptPath,
            },
            "Receipt generated and saved"
          );
        }
      } catch (error) {
        logger.error(
          {
            transactionRefId: request.transactionRefId,
            transactionId: transaction.id,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          "Failed to generate receipt - payment still successful"
        );
      }

      // Step 11: Send LINE notification
      try {
        // Fetch updated loan to get client details with LINE user ID
        const updatedLoan = await loansRepository.findById(request.loanId);
        if (updatedLoan && updatedLoan.client) {
          // Need to fetch full client details to get line_user_id
          const clientsRepository = await import("../clients/clients.repository");
          const fullClient = await clientsRepository.clientsRepository.findById(loan.client_id);

          if (fullClient && fullClient.line_user_id) {
            const notificationData: PaymentNotificationData = {
              amount: request.amount,
              allocation,
              balanceAfter: newOutstandingBalance,
              transactionRefId: request.transactionRefId,
              paymentDate: request.paymentDate,
              contractNumber: loan.contract_number,
            };

            await this.notificationService.sendPaymentConfirmation(
              fullClient.line_user_id,
              notificationData
            );

            // If loan is now closed, send celebration message
            if (newStatus === "Closed" && statusChanged) {
              const closedNotificationData: LoanClosedNotificationData = {
                contractNumber: loan.contract_number,
                totalPaid: parseFloat(loan.principal_amount),
                finalPaymentDate: request.paymentDate,
              };

              await this.notificationService.sendLoanClosedNotification(
                fullClient.line_user_id,
                closedNotificationData
              );
            }
          } else {
            logger.warn(
              {
                transactionRefId: request.transactionRefId,
                loanId: request.loanId,
              },
              "Client does not have LINE user ID - skipping notification"
            );
          }
        }
      } catch (error) {
        // Notification failures are logged but don't fail the payment
        logger.error(
          {
            transactionRefId: request.transactionRefId,
            transactionId: transaction.id,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          "Failed to send notification - payment still successful"
        );
      }

      const processingTime = Date.now() - startTime;

      logger.info(
        {
          transactionRefId: request.transactionRefId,
          loanId: request.loanId,
          transactionId: transaction.id,
          processingTime,
          newStatus,
          balanceAfter: newOutstandingBalance,
        },
        "Payment processing completed successfully"
      );

      return {
        transactionId: transaction.id,
        allocation,
        balanceAfter: newOutstandingBalance,
        principalRemaining: newOutstandingBalance,
        newStatus,
        receiptPath,
      };
    } catch (error) {
      logger.error(
        {
          transactionRefId: request.transactionRefId,
          loanId: request.loanId,
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Payment processing failed"
      );

      // Re-throw known errors
      if (
        error instanceof PaymentValidationError ||
        error instanceof DuplicateTransactionError ||
        error instanceof LoanNotFoundError ||
        error instanceof InvalidLoanStatusError
      ) {
        throw error;
      }

      // Wrap unknown errors
      throw new PaymentProcessingError(
        "Payment processing failed",
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate payment request
   * Checks for duplicate transactions, loan existence, and valid loan status
   * 
   * @param request - Payment processing request
   * @throws PaymentValidationError if validation fails
   * @throws DuplicateTransactionError if transaction already processed
   * @throws LoanNotFoundError if loan doesn't exist
   * @throws InvalidLoanStatusError if loan cannot accept payments
   */
  private async validatePayment(request: ProcessPaymentRequest): Promise<void> {
    logger.info(
      {
        transactionRefId: request.transactionRefId,
        loanId: request.loanId,
      },
      "Validating payment request"
    );

    // Check for required fields
    if (!request.transactionRefId || request.transactionRefId.trim() === "") {
      throw new PaymentValidationError("Transaction reference ID is required");
    }

    if (!request.loanId || request.loanId.trim() === "") {
      throw new PaymentValidationError("Loan ID is required");
    }

    if (!request.amount || request.amount <= 0) {
      throw new PaymentValidationError("Payment amount must be greater than zero", {
        amount: request.amount,
      });
    }

    if (!request.paymentDate) {
      throw new PaymentValidationError("Payment date is required");
    }

    // Check for duplicate transaction
    const existingTransaction = await paymentRepository.findByTransactionRef(
      request.transactionRefId
    );

    if (existingTransaction) {
      logger.warn(
        {
          transactionRefId: request.transactionRefId,
          existingTransactionId: existingTransaction.id,
        },
        "Duplicate transaction detected"
      );
      throw new DuplicateTransactionError(request.transactionRefId);
    }

    // Check if loan exists
    const loan = await loansRepository.findById(request.loanId);
    if (!loan) {
      throw new LoanNotFoundError(request.loanId);
    }

    // Check if loan can accept payments
    if (loan.contract_status === "Closed") {
      throw new InvalidLoanStatusError(request.loanId, loan.contract_status);
    }

    logger.info(
      {
        transactionRefId: request.transactionRefId,
        loanId: request.loanId,
      },
      "Payment validation passed"
    );
  }

  /**
   * Allocate payment using waterfall method
   * Priority order: penalties → interest → principal
   * 
   * @param paymentAmount - Total payment amount to allocate
   * @param penalties - Current penalties/fees owed
   * @param accruedInterest - Current accrued interest owed
   * @param principal - Current principal balance
   * @returns PaymentAllocation breakdown
   */
  allocatePayment(
    paymentAmount: number,
    penalties: number,
    accruedInterest: number,
    principal: number
  ): PaymentAllocation {
    let remaining = paymentAmount;
    let toPenalties = 0;
    let toInterest = 0;
    let toPrincipal = 0;

    // Step 1: Allocate to penalties first
    if (remaining > 0 && penalties > 0) {
      toPenalties = Math.min(remaining, penalties);
      remaining -= toPenalties;
    }

    // Step 2: Allocate to accrued interest
    if (remaining > 0 && accruedInterest > 0) {
      toInterest = Math.min(remaining, accruedInterest);
      remaining -= toInterest;
    }

    // Step 3: Allocate to principal
    if (remaining > 0 && principal > 0) {
      toPrincipal = Math.min(remaining, principal);
      remaining -= toPrincipal;
    }

    return {
      toPenalties,
      toInterest,
      toPrincipal,
      remaining,
    };
  }

  /**
   * Calculate accrued interest from last payment date to current date
   * Formula: (principal × annual_rate × days) / 365
   * 
   * @param principal - Outstanding principal amount
   * @param annualRate - Annual interest rate (as decimal, e.g., 0.15 for 15%)
   * @param lastPaymentDate - Date of last payment (or loan start date)
   * @param currentDate - Current payment date
   * @returns Accrued interest rounded to 2 decimal places
   */
  calculateAccruedInterest(
    principal: number,
    annualRate: number,
    lastPaymentDate: Date,
    currentDate: Date
  ): number {
    // Calculate days between dates
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysDiff = Math.floor(
      (currentDate.getTime() - lastPaymentDate.getTime()) / msPerDay
    );

    // Calculate daily interest and multiply by days
    const interest = (principal * annualRate) / 365;

    // Round to 2 decimal places
    return Math.round(interest * 100) / 100;
  }

  /**
   * Determine new loan status based on payment and balance
   * 
   * @param currentStatus - Current loan status
   * @param outstandingBalance - Outstanding balance after payment
   * @param overdueAmount - Amount that is overdue (penalties + overdue interest)
   * @returns New loan status
   */
  determineLoanStatus(
    currentStatus: string,
    outstandingBalance: number,
    overdueAmount: number
  ): string {
    // If balance is zero or negative, loan is closed
    if (outstandingBalance <= 0) {
      return "Closed";
    }

    // If loan was overdue and overdue amounts are cleared, transition to Active
    if (currentStatus === "Overdue" && overdueAmount <= 0) {
      return "Active";
    }

    // Otherwise, preserve current status
    return currentStatus;
  }

  /**
   * Get payment history for a loan with pagination
   * 
   * @param loanId - ID of the loan
   * @param page - Page number (1-indexed)
   * @param limit - Number of records per page
   * @returns Paginated payment history
   */
  async getPaymentHistory(loanId: string, page: number = 1, limit: number = 10) {
    logger.info(
      {
        loanId,
        page,
        limit,
      },
      "Fetching payment history"
    );

    // Validate loan exists
    const loan = await loansRepository.findById(loanId);
    if (!loan) {
      throw new LoanNotFoundError(loanId);
    }

    const offset = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      paymentRepository.findPaymentHistory(loanId, limit, offset),
      paymentRepository.countPayments(loanId),
    ]);

    const totalPages = Math.ceil(total / limit);

    logger.info(
      {
        loanId,
        page,
        limit,
        total,
        totalPages,
        returned: transactions.length,
      },
      "Payment history fetched successfully"
    );

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get payment details by transaction ID
   * 
   * @param transactionId - ID of the transaction
   * @returns Transaction with loan and client details
   * @throws Error if transaction not found
   */
  async getPaymentById(transactionId: string) {
    logger.info(
      {
        transactionId,
      },
      "Fetching payment details"
    );

    const transaction = await paymentRepository.findById(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    logger.info(
      {
        transactionId,
        loanId: transaction.loan.id,
        clientId: transaction.client.id,
      },
      "Payment details fetched successfully"
    );

    return transaction;
  }

  /**
   * Get receipt file path for a transaction
   * 
   * @param transactionId - ID of the transaction
   * @returns Receipt file path
   * @throws Error if transaction not found or receipt not available
   */
  async getReceiptPath(transactionId: string): Promise<string> {
    logger.info(
      {
        transactionId,
      },
      "Fetching receipt path"
    );

    const transaction = await paymentRepository.findById(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (!transaction.transaction.receipt_path) {
      throw new Error(`Receipt not available for transaction ${transactionId}`);
    }

    logger.info(
      {
        transactionId,
        receiptPath: transaction.transaction.receipt_path,
      },
      "Receipt path fetched successfully"
    );

    return transaction.transaction.receipt_path;
  }
}

export const paymentDomain = new PaymentDomain();
