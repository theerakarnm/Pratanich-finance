/**
 * Error thrown when payment validation fails
 */
export class PaymentValidationError extends Error {
  constructor(message: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'PaymentValidationError';
  }
}

/**
 * Error thrown when attempting to process a duplicate transaction
 */
export class DuplicateTransactionError extends Error {
  constructor(transactionRefId: string) {
    super(`Transaction ${transactionRefId} has already been processed`);
    this.name = 'DuplicateTransactionError';
  }
}

/**
 * Error thrown when a loan contract is not found
 */
export class LoanNotFoundError extends Error {
  constructor(loanId: string) {
    super(`Loan ${loanId} not found`);
    this.name = 'LoanNotFoundError';
  }
}

/**
 * Error thrown when a payment cannot be matched to a loan contract
 */
export class PaymentMatchingError extends Error {
  constructor(message: string, public slipokData?: any) {
    super(message);
    this.name = 'PaymentMatchingError';
  }
}

/**
 * Error thrown when a loan is in an invalid status for receiving payments
 */
export class InvalidLoanStatusError extends Error {
  constructor(loanId: string, status: string) {
    super(`Loan ${loanId} has status ${status} and cannot accept payments`);
    this.name = 'InvalidLoanStatusError';
  }
}

/**
 * Error thrown when payment processing fails
 */
export class PaymentProcessingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'PaymentProcessingError';
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}
