# Implementation Plan

- [-] 1. Database Schema Setup
  - Create database migration for new tables and fields
  - Add `transactions` table with all specified fields
  - Add `pending_payments` table for unmatched payments
  - Add new fields to `loans` table (principal_paid, interest_paid, penalties_paid, total_penalties, last_payment_date, last_payment_amount, previous_status, status_changed_at)
  - Create indexes on transaction_ref_id, loan_id, client_id, payment_date
  - Run migration and verify schema changes
  - _Requirements: 4.1, 6.1, 6.3, 6.4_

- [ ] 2. Implement Core Payment Domain Logic
- [ ] 2.1 Create payment types and interfaces
  - Define TypeScript interfaces for ProcessPaymentRequest, PaymentAllocation, PaymentResult, TransactionWithDetails
  - Define error classes: PaymentValidationError, DuplicateTransactionError, LoanNotFoundError, PaymentMatchingError, InvalidLoanStatusError, PaymentProcessingError
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [ ] 2.2 Write property test for payment allocation
  - **Property 3: Waterfall Allocation Order**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [ ] 2.3 Implement waterfall allocation method
  - Create `allocatePayment()` function that applies waterfall logic (penalties → interest → principal)
  - Ensure allocation sum equals payment amount
  - Handle partial payments correctly
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.4 Write property test for interest calculation
  - **Property 4: Interest Calculation Consistency**
  - **Validates: Requirements 3.1, 3.2, 3.4**

- [ ] 2.5 Implement interest calculation
  - Create `calculateAccruedInterest()` function using formula: (principal × rate × days) / 365
  - Round result to 2 decimal places
  - Handle date range from last_payment_date (or loan start date) to current date
  - _Requirements: 3.1, 3.2, 3.4_

- [ ] 2.6 Write property test for status transitions
  - **Property 7: Loan Status Transition to Closed**
  - **Property 8: Loan Status Transition from Overdue to Active**
  - **Property 9: Status Preservation for Partial Payments**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [ ] 2.7 Implement loan status determination logic
  - Create `determineLoanStatus()` function that evaluates status transitions
  - Handle Active → Closed when balance reaches zero
  - Handle Overdue → Active when overdue amounts cleared
  - Preserve status for partial payments
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 3. Implement Payment Repository Layer
- [ ] 3.1 Create payment repository with transaction methods
  - Implement `findByTransactionRef()` to check for duplicates
  - Implement `processPaymentTransaction()` with ACID transaction and row-level locking (FOR UPDATE)
  - Implement `createTransaction()` to insert transaction records
  - Implement `findPaymentHistory()` with pagination
  - Implement `countPayments()` for pagination
  - Implement `findById()` to get transaction with loan and client details
  - _Requirements: 1.1, 1.2, 4.1, 4.2, 6.1, 6.3, 9.5_

- [ ]* 3.2 Write property test for ACID transactions
  - **Property 6: ACID Transaction Atomicity**
  - **Validates: Requirements 4.1, 4.2**

- [ ]* 3.3 Write property test for idempotency
  - **Property 1: Idempotency of Payment Processing**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 3.4 Write property test for concurrent payment handling
  - **Property 18: Sequential Concurrent Payment Processing**
  - **Property 19: Lock Timeout Handling**
  - **Property 20: Lock Release After Transaction**
  - **Validates: Requirements 10.1, 10.4, 10.5**

- [ ] 4. Implement Payment Matching Service
- [ ] 4.1 Create payment matching service
  - Implement `findLoanForPayment()` with multiple matching strategies
  - Strategy 1: Extract contract number from sender info/notes
  - Strategy 2: Match by client's LINE user ID (via connect_codes table)
  - Strategy 3: Match by client's bank account number
  - Throw PaymentMatchingError if no match or multiple matches found
  - _Requirements: 1.3_

- [ ]* 4.2 Write unit tests for payment matching
  - Test contract number extraction from various text formats
  - Test matching by LINE user ID
  - Test matching by bank account
  - Test error handling for no match and multiple matches
  - _Requirements: 1.3_

- [ ] 5. Implement Receipt Generation
- [ ] 5.1 Set up PDF generation with pdfkit
  - Install pdfkit and @types/pdfkit
  - Create receipt template with company branding
  - _Requirements: 7.1_

- [ ] 5.2 Create receipt generator service
  - Implement `generateReceipt()` to create PDF with transaction details
  - Include: transaction ref ID, payment date, amount, allocation breakdown, remaining balance, loan details, client info
  - Implement `saveReceipt()` to save PDF to file system at /uploads/receipts/{year}/{month}/{transactionId}.pdf
  - Store relative path in transaction record
  - _Requirements: 7.1, 7.2, 7.5_

- [ ]* 5.3 Write property test for receipt generation
  - **Property 13: Receipt Generation and Storage**
  - **Validates: Requirements 7.1, 7.2, 7.5**

- [ ] 6. Implement Payment Notification Service
- [ ] 6.1 Create payment notification service
  - Implement `sendPaymentConfirmation()` using existing LineMessagingClient
  - Format message with payment amount, allocation breakdown, remaining balance, receipt link
  - Implement `sendLoanClosedNotification()` for paid-off loans with congratulatory message
  - Handle notification failures gracefully (log but don't throw)
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ]* 6.2 Write property test for notification resilience
  - **Property 14: Payment Notification Delivery**
  - **Property 15: Notification Failure Resilience**
  - **Validates: Requirements 8.1, 8.2, 8.4**

- [ ] 7. Implement Main Payment Processing Orchestration
- [ ] 7.1 Create payment domain class
  - Implement `processPayment()` method that orchestrates the full workflow
  - Call validation, interest calculation, allocation, repository transaction, status update, receipt generation, notification
  - Implement proper error handling and logging
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 3.1, 4.1, 5.1, 6.1, 9.1_

- [ ]* 7.2 Write property test for validation side effects
  - **Property 2: Validation Prevents Side Effects**
  - **Validates: Requirements 1.3, 1.5, 6.5**

- [ ]* 7.3 Write property test for last payment date update
  - **Property 5: Last Payment Date Update**
  - **Validates: Requirements 3.5**

- [ ]* 7.4 Write property test for status change audit
  - **Property 10: Status Change Audit Trail**
  - **Validates: Requirements 5.5**

- [ ]* 7.5 Write property test for transaction record completeness
  - **Property 11: Transaction Record Completeness**
  - **Validates: Requirements 6.1, 6.3**

- [ ]* 7.6 Write property test for UTC timestamp storage
  - **Property 12: UTC Timestamp Storage**
  - **Validates: Requirements 6.4**

- [ ] 8. Implement SlipOK Webhook Handler
- [ ] 8.1 Create webhook route handler
  - Create POST /api/webhooks/slipok endpoint
  - Parse SlipOK webhook payload
  - Check for duplicate transaction (return 200 if already processed)
  - Call payment matching service to find loan
  - If no match found: store in pending_payments table, alert admin, return 200
  - If match found: call payment domain to process payment
  - Return 200 OK to SlipOK
  - _Requirements: 1.1, 1.2, 1.3_

- [ ]* 8.2 Write integration test for webhook flow
  - Test successful payment processing via webhook
  - Test duplicate transaction handling
  - Test unmatched payment handling
  - Test error scenarios
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 9. Implement Pending Payments Management
- [ ] 9.1 Create pending payments repository
  - Implement methods to create, update, and query pending payments
  - Implement method to manually match pending payment to loan
  - _Requirements: 1.3_

- [ ] 9.2 Create admin endpoints for pending payments
  - GET /api/admin/pending-payments - List unmatched payments
  - POST /api/admin/pending-payments/:id/match - Manually match to loan
  - POST /api/admin/pending-payments/:id/process - Process matched payment
  - _Requirements: 1.3_

- [ ]* 9.3 Write unit tests for pending payment management
  - Test creating pending payment records
  - Test manual matching workflow
  - Test processing matched payments
  - _Requirements: 1.3_

- [ ] 10. Implement Payment History and Query APIs
- [ ] 10.1 Create payment query endpoints
  - GET /api/payments/:id - Get payment details
  - GET /api/payments/history/:loanId - Get payment history with pagination
  - GET /api/payments/receipt/:id - Download receipt PDF
  - Implement authorization checks
  - _Requirements: 9.5_

- [ ]* 10.2 Write property test for payment history filtering
  - **Property 17: Payment History Filtering**
  - **Validates: Requirements 9.5**

- [ ] 11. Implement Logging and Audit Trail
- [ ] 11.1 Add structured logging throughout payment flow
  - Log all validation steps with transaction ref ID, loan ID, amounts
  - Log allocation calculations with breakdown
  - Log database operations (insert, update)
  - Log errors with full stack traces
  - Log notification attempts and results
  - Use Pino structured logging with appropriate log levels
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ]* 11.2 Write property test for logging
  - **Property 16: Payment Operation Logging**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**

- [ ] 12. Configuration and Environment Setup
- [ ] 12.1 Add environment variables
  - Add RECEIPT_STORAGE_PATH to config
  - Add PAYMENT_LOCK_TIMEOUT_MS to config
  - Update .env.example with new variables
  - _Requirements: 7.5, 10.1_

- [ ] 12.2 Create receipt storage directory structure
  - Ensure /uploads/receipts directory exists
  - Create subdirectories by year/month as needed
  - _Requirements: 7.5_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Integration Testing and Manual Testing
- [ ]* 14.1 Write end-to-end integration tests
  - Test complete payment flow from webhook to notification
  - Test with real database (test environment)
  - Test concurrent payment scenarios
  - Test error recovery and rollback
  - _Requirements: All_

- [ ]* 14.2 Manual testing checklist
  - Test SlipOK webhook with sample payloads
  - Verify receipt PDF generation and content
  - Verify LINE notifications are sent correctly
  - Test admin pending payment management UI
  - Test payment history queries
  - Verify database transactions and rollbacks
  - _Requirements: All_

- [ ] 15. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
