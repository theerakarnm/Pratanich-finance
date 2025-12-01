# Payment Processing System Design

## Overview

The Payment Processing System is a critical financial component that handles client loan payments with precision and reliability. The system processes incoming payments, validates transactions for idempotency, allocates funds according to the waterfall method (fees → interest → principal), updates loan balances atomically, manages status transitions, generates receipts, and notifies clients via LINE messaging.

The design follows a three-layer architecture (Controller → Domain → Repository) consistent with the existing codebase, uses Drizzle ORM for database operations with ACID transaction support, and integrates with existing systems including LINE Messaging API for notifications and SlipOK for payment slip verification.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Hono)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  POST /api/payments/process                          │  │
│  │  GET  /api/payments/:id                              │  │
│  │  GET  /api/payments/history/:loanId                  │  │
│  │  GET  /api/payments/receipt/:transactionId           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PaymentDomain                                       │  │
│  │  - processPayment()                                  │  │
│  │  - validatePayment()                                 │  │
│  │  - allocatePayment()                                 │  │
│  │  - calculateAccruedInterest()                        │  │
│  │  - updateLoanStatus()                                │  │
│  │  - generateReceipt()                                 │  │
│  │  - sendNotification()                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PaymentRepository                                   │  │
│  │  - createTransaction()                               │  │
│  │  - findByTransactionRef()                            │  │
│  │  - updateLoanBalance()                               │  │
│  │  - findPaymentHistory()                              │  │
│  │                                                       │  │
│  │  LoansRepository (existing)                          │  │
│  │  - findById()                                        │  │
│  │  - update()                                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                Database (PostgreSQL)                        │
│  - transactions                                             │
│  - loans (existing)                                         │
│  - clients (existing)                                       │
│  - slipok_logs (existing)                                   │
└─────────────────────────────────────────────────────────────┘

External Integrations:
┌──────────────────┐     ┌──────────────────┐
│  LINE Messaging  │     │  PDF Generator   │
│      API         │     │   (pdfkit)       │
└──────────────────┘     └──────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Client uploads payment slip via LINE                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SlipOK Webhook receives verified payment data              │
│  - transRef (transaction reference ID)                      │
│  - amount                                                    │
│  - transDate, transTime                                     │
│  - sender, receiver info                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  1. Check Duplicate Transaction                             │
│     - Query by transRef                                     │
│     - If exists → Return 200 OK (already processed)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Find Loan Contract                                      │
│     - Match by client LINE ID or contract number            │
│     - Validate loan status (not Closed)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Calculate Accrued Interest                              │
│     - From last_payment_date to NOW                         │
│     - Formula: (principal × rate × days) / 365              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. Waterfall Allocation                                    │
│     - Step 1: Allocate to penalties/fees                    │
│     - Step 2: Allocate to accrued interest                  │
│     - Step 3: Allocate to principal                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Database Transaction (ACID)                             │
│     - BEGIN TRANSACTION                                     │
│     - INSERT transaction record                             │
│     - UPDATE loan balances                                  │
│     - UPDATE loan status if needed                          │
│     - COMMIT                                                │
│     - On error → ROLLBACK                                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. Generate Receipt PDF                                    │
│     - Create PDF with allocation details                    │
│     - Save to file system                                   │
│     - Store path in transaction record                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  7. Send LINE Notification                                  │
│     - Push message with payment confirmation                │
│     - Include allocation breakdown                          │
│     - Include receipt link                                  │
│     - If fails → Log error (don't fail payment)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  8. Return 200 OK to SlipOK                                 │
│     - Acknowledge webhook received                          │
└─────────────────────────────────────────────────────────────┘
```

**Key Flow Points:**

1. **Payment Initiation**: Client uploads payment slip via LINE → SlipOK verifies → Webhook sent to our system
2. **Duplicate Check**: System checks transaction reference ID (transRef from SlipOK) for duplicates
3. **Contract Lookup**: System finds the loan contract associated with the payment
4. **Interest Calculation**: System calculates accrued interest from last payment date to NOW
5. **Allocation**: System applies waterfall method to allocate payment (fees → interest → principal)
6. **Database Update**: System updates loan balance and creates transaction record in single ACID transaction
7. **Status Update**: System evaluates loan status and transitions if needed (Active/Overdue/Closed)
8. **Receipt Generation**: System generates PDF receipt with allocation breakdown
9. **Notification**: System sends LINE message to client with payment confirmation
10. **Response**: System returns 200 OK to SlipOK webhook

## Components and Interfaces

### 1. Payment Domain (`payments.domain.ts`)

**Responsibilities:**
- Orchestrate payment processing workflow
- Validate payment requests
- Calculate accrued interest
- Allocate payments using waterfall method
- Coordinate database transactions
- Trigger receipt generation and notifications

**Key Methods:**

```typescript
class PaymentDomain {
  /**
   * Process a payment for a loan contract
   * @throws PaymentValidationError if validation fails
   * @throws DuplicateTransactionError if transaction already processed
   * @throws LoanNotFoundError if loan doesn't exist
   */
  async processPayment(request: ProcessPaymentRequest): Promise<PaymentResult>
  
  /**
   * Validate payment request
   * @throws PaymentValidationError if validation fails
   */
  private async validatePayment(request: ProcessPaymentRequest): Promise<void>
  
  /**
   * Calculate accrued interest from last payment date to current date
   */
  private calculateAccruedInterest(
    principal: number,
    annualRate: number,
    lastPaymentDate: Date,
    currentDate: Date
  ): number
  
  /**
   * Allocate payment using waterfall method
   * Returns allocation breakdown
   */
  private allocatePayment(
    paymentAmount: number,
    penalties: number,
    accruedInterest: number,
    principal: number
  ): PaymentAllocation
  
  /**
   * Determine new loan status based on payment and balance
   */
  private determineLoanStatus(
    currentStatus: string,
    outstandingBalance: number,
    overdueAmount: number
  ): string
  
  /**
   * Get payment history for a loan
   */
  async getPaymentHistory(loanId: string, page: number, limit: number): Promise<PaginatedPayments>
  
  /**
   * Get payment receipt data
   */
  async getPaymentReceipt(transactionId: string): Promise<PaymentReceipt>
}
```

### 2. Payment Repository (`payments.repository.ts`)

**Responsibilities:**
- Execute database operations for payment transactions
- Manage ACID transactions with row-level locking
- Query payment history
- Update loan balances

**Key Methods:**

```typescript
class PaymentRepository {
  /**
   * Check if transaction reference already exists
   */
  async findByTransactionRef(transactionRef: string): Promise<Transaction | null>
  
  /**
   * Process payment in ACID transaction with row locking
   * @throws Error if transaction fails
   */
  async processPaymentTransaction(
    loanId: string,
    transactionData: TransactionInsert,
    loanUpdates: LoanUpdates
  ): Promise<Transaction>
  
  /**
   * Create transaction record
   */
  async createTransaction(data: TransactionInsert): Promise<Transaction>
  
  /**
   * Get payment history for a loan with pagination
   */
  async findPaymentHistory(
    loanId: string,
    limit: number,
    offset: number
  ): Promise<Transaction[]>
  
  /**
   * Count total payments for a loan
   */
  async countPayments(loanId: string): Promise<number>
  
  /**
   * Get transaction by ID with loan and client details
   */
  async findById(transactionId: string): Promise<TransactionWithDetails | null>
}
```

### 3. Receipt Generator (`receipt.generator.ts`)

**Responsibilities:**
- Generate PDF receipts for payments
- Format payment allocation details
- Include loan and client information

**Key Methods:**

```typescript
class ReceiptGenerator {
  /**
   * Generate PDF receipt for a payment transaction
   * @returns Buffer containing PDF data
   */
  async generateReceipt(transaction: TransactionWithDetails): Promise<Buffer>
  
  /**
   * Save receipt to file system
   * @returns File path
   */
  async saveReceipt(transactionId: string, pdfBuffer: Buffer): Promise<string>
}
```

### 4. Payment Notification Service (`payment-notification.service.ts`)

**Responsibilities:**
- Send LINE notifications for payment confirmations
- Format notification messages with payment details
- Handle notification failures gracefully

**Key Methods:**

```typescript
class PaymentNotificationService {
  /**
   * Send payment confirmation to client via LINE
   * Does not throw errors - logs failures instead
   */
  async sendPaymentConfirmation(
    lineUserId: string,
    paymentData: PaymentNotificationData
  ): Promise<void>
  
  /**
   * Send loan paid-off celebration message
   */
  async sendLoanClosedNotification(
    lineUserId: string,
    loanData: LoanClosedNotificationData
  ): Promise<void>
}
```

### 5. Payment Matching Service (`payment-matching.service.ts`)

**Responsibilities:**
- Match incoming SlipOK payments to loan contracts
- Support multiple matching strategies (LINE user ID, contract number in notes, etc.)
- Handle ambiguous or unmatched payments

**Key Methods:**

```typescript
class PaymentMatchingService {
  /**
   * Find loan contract for a payment
   * Strategies:
   * 1. Check if sender info contains contract number
   * 2. Match by client's LINE user ID (from connect_codes table)
   * 3. Match by client's bank account number
   * 
   * @throws PaymentMatchingError if no match or multiple matches found
   */
  async findLoanForPayment(
    slipokData: SlipOKWebhookPayload,
    lineUserId?: string
  ): Promise<Loan>
  
  /**
   * Extract contract number from payment notes/reference
   */
  private extractContractNumber(text: string): string | null
}
```

## Data Models

### New Database Schema: Transactions Table

```typescript
export const transactionTypeEnum = pgEnum("transaction_type", [
  "Payment",
  "Disbursement",
  "Fee",
  "Adjustment"
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "Pending",
  "Completed",
  "Failed",
  "Reversed"
]);

export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 36 })
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  
  // Reference IDs
  transaction_ref_id: varchar("transaction_ref_id", { length: 100 })
    .unique()
    .notNull(),
  loan_id: varchar("loan_id", { length: 36 })
    .references(() => loans.id)
    .notNull(),
  client_id: varchar("client_id", { length: 36 })
    .references(() => clients.id)
    .notNull(),
  
  // Transaction details
  transaction_type: transactionTypeEnum("transaction_type").notNull(),
  transaction_status: transactionStatusEnum("transaction_status")
    .default("Completed")
    .notNull(),
  payment_date: timestamp("payment_date").notNull(),
  
  // Amounts
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  amount_to_penalties: decimal("amount_to_penalties", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  amount_to_interest: decimal("amount_to_interest", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  amount_to_principal: decimal("amount_to_principal", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  
  // Balance snapshots (after this transaction)
  balance_after: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
  principal_remaining: decimal("principal_remaining", { precision: 12, scale: 2 }).notNull(),
  
  // Payment method and source
  payment_method: varchar("payment_method", { length: 50 }), // "Bank Transfer", "Cash", "PromptPay"
  payment_source: varchar("payment_source", { length: 100 }), // Bank name or source
  
  // Receipt
  receipt_path: varchar("receipt_path", { length: 255 }),
  
  // Metadata
  notes: varchar("notes", { length: 500 }),
  processed_by: varchar("processed_by", { length: 36 }), // Admin user ID if manual
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
```

### Extended Loans Schema

The existing `loans` table needs additional fields to support payment processing:

```typescript
// Add these fields to existing loans schema
export const loans = pgTable("loans", {
  // ... existing fields ...
  
  // Payment tracking
  principal_paid: decimal("principal_paid", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  interest_paid: decimal("interest_paid", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  penalties_paid: decimal("penalties_paid", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  total_penalties: decimal("total_penalties", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  
  // Last payment tracking
  last_payment_date: timestamp("last_payment_date"),
  last_payment_amount: decimal("last_payment_amount", { precision: 12, scale: 2 }),
  
  // Status history
  previous_status: contractStatusEnum("previous_status"),
  status_changed_at: timestamp("status_changed_at"),
  
  // ... existing fields ...
});
```

### Pending Payments Table

For payments that cannot be automatically matched to a loan contract:

```typescript
export const pendingPaymentStatusEnum = pgEnum("pending_payment_status", [
  "Unmatched",
  "Matched",
  "Processed",
  "Rejected"
]);

export const pendingPayments = pgTable("pending_payments", {
  id: varchar("id", { length: 36 })
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  
  // SlipOK data
  transaction_ref_id: varchar("transaction_ref_id", { length: 100 })
    .unique()
    .notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  payment_date: timestamp("payment_date").notNull(),
  
  // Sender/Receiver info from SlipOK
  sender_info: jsonb("sender_info").notNull(),
  receiver_info: jsonb("receiver_info").notNull(),
  bank_info: jsonb("bank_info").notNull(),
  
  // Matching status
  status: pendingPaymentStatusEnum("status").default("Unmatched").notNull(),
  
  // Manual matching
  matched_loan_id: varchar("matched_loan_id", { length: 36 })
    .references(() => loans.id),
  matched_by: varchar("matched_by", { length: 36 }), // Admin user ID
  matched_at: timestamp("matched_at"),
  
  // Processing
  processed_transaction_id: varchar("processed_transaction_id", { length: 36 })
    .references(() => transactions.id),
  processed_at: timestamp("processed_at"),
  
  // Notes
  admin_notes: varchar("admin_notes", { length: 500 }),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
```

### TypeScript Interfaces

```typescript
interface ProcessPaymentRequest {
  transactionRefId: string;
  loanId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod?: string;
  paymentSource?: string;
  notes?: string;
  processedBy?: string;
}

interface PaymentAllocation {
  toPenalties: number;
  toInterest: number;
  toPrincipal: number;
  remaining: number; // Should be 0 if fully allocated
}

interface PaymentResult {
  transactionId: string;
  allocation: PaymentAllocation;
  balanceAfter: number;
  principalRemaining: number;
  newStatus: string;
  receiptPath?: string;
}

interface TransactionWithDetails {
  transaction: Transaction;
  loan: Loan;
  client: Client;
}

interface PaymentNotificationData {
  amount: number;
  allocation: PaymentAllocation;
  balanceAfter: number;
  transactionRefId: string;
  paymentDate: Date;
  contractNumber: string;
}

interface LoanClosedNotificationData {
  contractNumber: string;
  totalPaid: number;
  finalPaymentDate: Date;
}
```

## Error Handling

### Custom Error Classes

```typescript
class PaymentValidationError extends Error {
  constructor(message: string, public details?: Record<string, any>) {
    super(message);
    this.name = 'PaymentValidationError';
  }
}

class DuplicateTransactionError extends Error {
  constructor(transactionRefId: string) {
    super(`Transaction ${transactionRefId} has already been processed`);
    this.name = 'DuplicateTransactionError';
  }
}

class LoanNotFoundError extends Error {
  constructor(loanId: string) {
    super(`Loan ${loanId} not found`);
    this.name = 'LoanNotFoundError';
  }
}

class PaymentMatchingError extends Error {
  constructor(message: string, public slipokData?: any) {
    super(message);
    this.name = 'PaymentMatchingError';
  }
}

class InvalidLoanStatusError extends Error {
  constructor(loanId: string, status: string) {
    super(`Loan ${loanId} has status ${status} and cannot accept payments`);
    this.name = 'InvalidLoanStatusError';
  }
}

class PaymentProcessingError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'PaymentProcessingError';
  }
}
```

### Error Handling Strategy

1. **Validation Errors**: Return 400 Bad Request with detailed error message
2. **Duplicate Transaction**: Return 200 OK (idempotent - already processed)
3. **Payment Matching Errors**: Log error, store in pending_payments table, alert admin via LINE
4. **Not Found Errors**: Return 404 Not Found
5. **Database Errors**: Rollback transaction, log error, alert admin, return 500 Internal Server Error
6. **Notification Failures**: Log error but don't fail the payment transaction
7. **Receipt Generation Failures**: Log error, complete payment, allow retry later

### Unmatched Payment Handling

When a payment cannot be matched to a loan contract:

1. Store payment data in `pending_payments` table with status "Unmatched"
2. Send LINE alert to admin group with payment details
3. Admin can manually match payment to contract via admin portal
4. Once matched, process payment normally
5. Return 200 OK to SlipOK (acknowledge receipt)

### Logging

All payment operations must be logged with:
- Transaction reference ID
- Loan ID and contract number
- Client ID
- Payment amount and allocation
- Timestamps
- Success/failure status
- Error details if applicable

Use structured logging with Pino:

```typescript
logger.info({
  transactionRefId,
  loanId,
  amount,
  allocation,
  balanceAfter
}, 'Payment processed successfully');

logger.error({
  transactionRefId,
  loanId,
  error: error.message,
  stack: error.stack
}, 'Payment processing failed');
```

## Testing Strategy

### Unit Testing

The system will use **Bun's built-in test runner** for unit tests. Unit tests will cover:

1. **Payment Allocation Logic**
   - Test waterfall allocation with various payment amounts
   - Test edge cases: zero penalties, zero interest, exact payment amounts
   - Test partial payments that don't clear all categories

2. **Interest Calculation**
   - Test daily interest calculation with various rates and periods
   - Test leap year handling
   - Test rounding behavior

3. **Status Transition Logic**
   - Test Active → Closed transition when balance reaches zero
   - Test Overdue → Active transition when overdue amounts cleared
   - Test status remains unchanged for partial payments

4. **Validation Logic**
   - Test duplicate transaction detection
   - Test invalid loan status rejection
   - Test closed loan rejection

5. **Error Handling**
   - Test custom error classes are thrown correctly
   - Test error messages contain appropriate details

### Property-Based Testing

The system will use **fast-check** library for property-based testing. Each correctness property from the design document will be implemented as a property-based test with a minimum of 100 iterations.

**Property-based test requirements:**
- Each test must run at least 100 iterations
- Each test must be tagged with a comment referencing the correctness property: `// Feature: payment-processing, Property X: [property text]`
- Each correctness property must be implemented by a SINGLE property-based test
- Tests should use smart generators that constrain inputs to valid ranges

**Test file organization:**
- Unit tests: `*.test.ts` co-located with source files
- Property tests: `*.property.test.ts` co-located with source files

### Integration Testing

Integration tests will verify:
1. End-to-end payment processing flow with real database
2. ACID transaction behavior (rollback on failure)
3. Concurrent payment handling with row locking
4. LINE notification integration (with mock LINE API)
5. Receipt generation and file storage

### Test Database

Use a separate test database with:
- Same schema as production
- Seed data for common test scenarios
- Automatic cleanup between tests


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Idempotency of Payment Processing

*For any* payment with a transaction reference ID that has already been processed, attempting to process it again should be rejected with a duplicate transaction error, and no database modifications should occur.

**Validates: Requirements 1.1, 1.2**

### Property 2: Validation Prevents Side Effects

*For any* invalid payment request (non-existent loan, closed loan, missing required fields), the validation failure should return an error without creating any transaction records or modifying any loan balances.

**Validates: Requirements 1.3, 1.5, 6.5**

### Property 3: Waterfall Allocation Order

*For any* payment amount and debt composition (penalties, accrued interest, principal), the allocation should apply funds in strict priority order: first to penalties until zero or payment exhausted, then to accrued interest until zero or payment exhausted, then to principal. The sum of allocated amounts should equal the payment amount.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 4: Interest Calculation Consistency

*For any* loan with an outstanding principal, interest rate, and date range, the accrued interest calculated should equal (principal × annual_rate × days) / 365, rounded to two decimal places.

**Validates: Requirements 3.1, 3.2, 3.4**

### Property 5: Last Payment Date Update

*For any* successfully processed payment, the loan's last payment date should be updated to the payment date, enabling correct interest calculation for future payments.

**Validates: Requirements 3.5**

### Property 6: ACID Transaction Atomicity

*For any* payment processing operation, if any database operation fails (loan update, transaction insert, or status change), then all changes should be rolled back and the database should remain in its original state with no partial updates.

**Validates: Requirements 4.1, 4.2**

### Property 7: Loan Status Transition to Closed

*For any* loan with a positive outstanding balance, if a payment reduces the outstanding balance to zero or below, then the loan status should transition to Closed.

**Validates: Requirements 5.1**

### Property 8: Loan Status Transition from Overdue to Active

*For any* loan in Overdue status, if a payment brings all overdue amounts current (clears all penalties and overdue interest), then the loan status should transition to Active.

**Validates: Requirements 5.2**

### Property 9: Status Preservation for Partial Payments

*For any* Active loan receiving a partial payment (payment less than outstanding balance), the loan status should remain Active. For any Overdue loan receiving a partial payment that doesn't clear overdue amounts, the status should remain Overdue.

**Validates: Requirements 5.3, 5.4**

### Property 10: Status Change Audit Trail

*For any* loan status transition, the system should record the previous status and the timestamp of the status change for audit purposes.

**Validates: Requirements 5.5**

### Property 11: Transaction Record Completeness

*For any* successfully processed payment, a transaction record should be created containing the transaction reference ID, loan ID, client ID, payment amount, payment date, allocation breakdown (to penalties, to interest, to principal), and balance snapshots (balance after, principal remaining).

**Validates: Requirements 6.1, 6.3**

### Property 12: UTC Timestamp Storage

*For any* transaction record created, all timestamp fields (payment_date, created_at, updated_at) should be stored in UTC timezone.

**Validates: Requirements 6.4**

### Property 13: Receipt Generation and Storage

*For any* successfully processed payment, a PDF receipt should be generated containing the transaction reference ID, payment date, amount, allocation breakdown, remaining balance, loan details, and client information. The receipt file path should be stored in the transaction record.

**Validates: Requirements 7.1, 7.2, 7.5**

### Property 14: Payment Notification Delivery

*For any* successfully processed payment where the client has a LINE user ID, a notification should be sent via LINE containing the payment amount, allocation breakdown, remaining balance, and receipt link.

**Validates: Requirements 8.1, 8.2**

### Property 15: Notification Failure Resilience

*For any* payment where the LINE notification fails to send, the payment transaction should still complete successfully and commit to the database, with the notification failure logged as a warning.

**Validates: Requirements 8.4**

### Property 16: Payment Operation Logging

*For any* payment processing attempt (successful or failed), the system should create structured log entries containing the transaction reference ID, loan ID, payment amount, allocation details (if successful), error details (if failed), and timestamps.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 17: Payment History Filtering

*For any* query for payment history with filters (client ID, loan ID, date range, transaction status), the returned results should include only transactions matching all specified filter criteria, ordered by payment date descending.

**Validates: Requirements 9.5**

### Property 18: Sequential Concurrent Payment Processing

*For any* two or more payment requests for the same loan contract submitted concurrently, the system should process them sequentially (one at a time) using database row-level locking, ensuring each payment sees the correct balance from the previous payment.

**Validates: Requirements 10.1**

### Property 19: Lock Timeout Handling

*For any* payment request that cannot acquire a lock on the loan record within the timeout period, the system should return an error indicating the system is busy, without processing the payment or modifying any data.

**Validates: Requirements 10.4**

### Property 20: Lock Release After Transaction

*For any* completed payment transaction (successful or failed), all database locks should be released immediately, allowing subsequent payment requests for the same loan to proceed without delay.

**Validates: Requirements 10.5**

## Implementation Notes

### Database Migration

A new migration is required to:
1. Create the `transactions` table with all specified fields and indexes
2. Add new fields to the `loans` table: `principal_paid`, `interest_paid`, `penalties_paid`, `total_penalties`, `last_payment_date`, `last_payment_amount`, `previous_status`, `status_changed_at`
3. Create indexes on `transactions.transaction_ref_id`, `transactions.loan_id`, `transactions.client_id`, `transactions.payment_date`
4. Create indexes on `loans.last_payment_date`, `loans.contract_status`

### External Dependencies

1. **pdfkit**: PDF generation library for receipts
   - Install: `bun add pdfkit @types/pdfkit`
   
2. **fast-check**: Property-based testing library
   - Install: `bun add -d fast-check`

3. **LINE Messaging API**: Already integrated via `LineMessagingClient`

4. **SlipOK API**: Already integrated via `SlipOKService`

### File Storage

Receipts will be stored in the file system at:
- Path: `/uploads/receipts/{year}/{month}/{transactionId}.pdf`
- Ensure directory exists before writing
- Store relative path in database: `receipts/{year}/{month}/{transactionId}.pdf`

### Configuration

Add to environment variables:
```
RECEIPT_STORAGE_PATH=/uploads/receipts
PAYMENT_LOCK_TIMEOUT_MS=5000
```

### API Endpoints

```
POST   /api/webhooks/slipok           - SlipOK webhook endpoint (processes payments)
POST   /api/payments/manual           - Manual payment entry (admin only)
GET    /api/payments/:id              - Get payment details
GET    /api/payments/history/:loanId  - Get payment history for a loan
GET    /api/payments/receipt/:id      - Download payment receipt PDF
```

**Webhook Payload from SlipOK:**
```typescript
interface SlipOKWebhookPayload {
  success: boolean;
  data: {
    transRef: string;        // Transaction reference ID
    sendingBank: string;     // Bank code (e.g., "002" for BBL)
    receivingBank: string;   // Bank code
    transDate: string;       // Format: "YYYYMMDD"
    transTime: string;       // Format: "HHmmss"
    amount: number;          // Payment amount
    sender: {
      displayName: string;
      name: string;
      account: string;
    };
    receiver: {
      displayName: string;
      name: string;
      account: string;
    };
    success: boolean;
    message: string;
  };
}
```

### Performance Considerations

1. **Database Indexes**: Ensure indexes exist on frequently queried fields
2. **Row Locking**: Use `FOR UPDATE` in SELECT queries to acquire pessimistic locks
3. **Connection Pooling**: Leverage Drizzle's connection pooling for concurrent requests
4. **Receipt Caching**: Consider caching generated PDFs to avoid regeneration
5. **Async Notifications**: Send LINE notifications asynchronously to avoid blocking payment response

### Security Considerations

1. **Transaction Reference Validation**: Validate format and length to prevent injection
2. **Amount Validation**: Ensure positive amounts, reasonable maximums
3. **Authorization**: Verify user has permission to process payments for the loan
4. **Audit Logging**: Log all payment attempts with user context
5. **Receipt Access Control**: Verify user authorization before serving receipt PDFs
