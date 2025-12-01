# Requirements Document

## Introduction

This document specifies the requirements for a payment processing system that handles debt reduction for loan contracts. The system must process incoming payments from clients, allocate funds according to financial accounting standards (waterfall method), update loan balances, manage transaction records, and handle status transitions. The implementation must ensure idempotency, data consistency through ACID transactions, and provide proper notifications and documentation.

## Glossary

- **Payment System**: The software component responsible for processing client payments and reducing loan debt
- **Loan Contract**: A financial agreement between the lender and client specifying principal, interest rate, and terms
- **Transaction Reference ID**: A unique identifier for each payment transaction used to prevent duplicate processing
- **Waterfall Allocation**: A debt payment allocation method where funds are applied in priority order (fees → interest → principal)
- **Outstanding Balance**: The total remaining debt on a loan contract including principal and accrued interest
- **Accrued Interest**: Interest that has accumulated since the last payment date
- **Idempotency**: The property that processing the same payment multiple times produces the same result as processing it once
- **ACID Transaction**: A database transaction that guarantees Atomicity, Consistency, Isolation, and Durability
- **Status Transition**: The change of a loan contract's status based on payment activity and balance conditions

## Requirements

### Requirement 1: Payment Validation and Idempotency

**User Story:** As a system administrator, I want the system to validate incoming payments and prevent duplicate processing, so that clients are not charged multiple times for the same payment.

#### Acceptance Criteria

1. WHEN the Payment System receives a payment with a transaction reference ID, THEN the Payment System SHALL check if that transaction reference ID exists in the database
2. IF a transaction reference ID already exists in the database, THEN the Payment System SHALL reject the payment and return an error indicating duplicate transaction
3. WHEN the Payment System validates a new transaction reference ID, THEN the Payment System SHALL verify that the associated loan contract exists and is in a valid state for receiving payments
4. WHEN a loan contract is in Closed status, THEN the Payment System SHALL reject new payments for that contract
5. WHEN payment validation fails for any reason, THEN the Payment System SHALL return a detailed error message without modifying any database records

### Requirement 2: Payment Allocation Using Waterfall Method

**User Story:** As a financial officer, I want payments to be allocated according to standard accounting practices, so that fees and interest are collected before principal reduction.

#### Acceptance Criteria

1. WHEN the Payment System allocates a payment amount, THEN the Payment System SHALL apply funds in the following order: penalties and fees first, then accrued interest, then principal
2. WHEN allocating to penalties and fees, THEN the Payment System SHALL deduct the payment amount from total penalties until penalties reach zero or payment is exhausted
3. WHEN allocating to accrued interest after penalties are cleared, THEN the Payment System SHALL calculate accrued interest from the last payment date to the current date and deduct the payment amount from accrued interest
4. WHEN allocating to principal after penalties and interest are cleared, THEN the Payment System SHALL deduct the remaining payment amount from the outstanding principal balance
5. WHEN the payment amount is insufficient to clear all debt categories, THEN the Payment System SHALL apply the full payment amount according to priority order and leave remaining debt in lower priority categories

### Requirement 3: Accrued Interest Calculation

**User Story:** As a financial officer, I want the system to accurately calculate accrued interest, so that clients pay the correct amount of interest based on their payment timing.

#### Acceptance Criteria

1. WHEN calculating accrued interest, THEN the Payment System SHALL compute interest from the last payment date (or loan start date if no payments exist) to the current payment date
2. WHEN calculating daily interest, THEN the Payment System SHALL use the formula: (outstanding_principal × annual_interest_rate) / 365
3. WHEN the loan contract specifies an interest rate, THEN the Payment System SHALL use that rate for all interest calculations
4. WHEN accrued interest is calculated, THEN the Payment System SHALL round the result to two decimal places
5. WHEN a payment is processed, THEN the Payment System SHALL update the last payment date to the current date for future interest calculations

### Requirement 4: Database Transaction Management

**User Story:** As a system administrator, I want all payment processing operations to be atomic, so that the system maintains data consistency even during failures.

#### Acceptance Criteria

1. WHEN the Payment System processes a payment, THEN the Payment System SHALL execute all database operations within a single ACID transaction
2. IF any database operation fails during payment processing, THEN the Payment System SHALL roll back all changes and leave the database in its original state
3. WHEN updating loan balances, THEN the Payment System SHALL update the outstanding_balance, principal_paid, interest_paid, and penalties_paid fields atomically
4. WHEN creating a transaction record, THEN the Payment System SHALL insert the record with allocation details (amount to fees, amount to interest, amount to principal) in the same transaction as balance updates
5. WHEN a database transaction commits successfully, THEN the Payment System SHALL ensure all changes are persisted before returning success to the caller

### Requirement 5: Loan Status Transitions

**User Story:** As a loan officer, I want loan contract statuses to update automatically based on payment activity, so that I can track which loans are current, overdue, or paid off.

#### Acceptance Criteria

1. WHEN a payment reduces the outstanding balance to zero or below, THEN the Payment System SHALL transition the loan status to Closed
2. WHEN a loan is in Overdue status and a payment brings all overdue amounts current, THEN the Payment System SHALL transition the loan status to Active
3. WHEN a partial payment is made on an Active loan, THEN the Payment System SHALL maintain the Active status while updating the balance
4. WHEN a partial payment is made on an Overdue loan but overdue amounts remain, THEN the Payment System SHALL maintain the Overdue status
5. WHEN the loan status changes, THEN the Payment System SHALL record the status change timestamp and previous status for audit purposes

### Requirement 6: Transaction Record Creation

**User Story:** As an auditor, I want detailed transaction records for every payment, so that I can verify payment allocation and maintain financial transparency.

#### Acceptance Criteria

1. WHEN the Payment System processes a payment, THEN the Payment System SHALL create a transaction record with the transaction reference ID, payment amount, payment date, and allocation breakdown
2. WHEN recording payment allocation, THEN the Payment System SHALL store the amount allocated to penalties, interest, and principal as separate fields
3. WHEN a transaction record is created, THEN the Payment System SHALL link it to the specific loan contract and client
4. WHEN storing transaction timestamps, THEN the Payment System SHALL use UTC timezone for all datetime fields
5. WHEN a payment is rejected due to validation failure, THEN the Payment System SHALL NOT create a transaction record

### Requirement 7: Receipt Generation

**User Story:** As a client, I want to receive a detailed receipt after making a payment, so that I have proof of payment and understand how my payment was applied.

#### Acceptance Criteria

1. WHEN a payment is successfully processed, THEN the Payment System SHALL generate a PDF receipt document
2. WHEN generating a receipt, THEN the Payment System SHALL include the transaction reference ID, payment date, total amount paid, and allocation breakdown (fees, interest, principal)
3. WHEN generating a receipt, THEN the Payment System SHALL include the remaining balance after payment and the loan contract details
4. WHEN generating a receipt, THEN the Payment System SHALL include the client name, loan contract number, and payment method
5. WHEN the receipt is generated, THEN the Payment System SHALL store the receipt file path in the transaction record for future retrieval

### Requirement 8: Client Notification

**User Story:** As a client, I want to be notified immediately after my payment is processed, so that I have confirmation and peace of mind.

#### Acceptance Criteria

1. WHEN a payment is successfully processed, THEN the Payment System SHALL send a LINE notification to the client
2. WHEN sending a notification, THEN the Payment System SHALL include the payment amount, allocation breakdown, and remaining balance
3. WHEN the loan status changes to Closed, THEN the Payment System SHALL send a special congratulatory message indicating the loan is fully paid
4. WHEN a notification fails to send, THEN the Payment System SHALL log the error but NOT roll back the payment transaction
5. WHEN sending notifications, THEN the Payment System SHALL include a link to view the detailed receipt

### Requirement 9: Payment History and Audit Trail

**User Story:** As a system administrator, I want a complete audit trail of all payment processing activities, so that I can troubleshoot issues and maintain compliance.

#### Acceptance Criteria

1. WHEN the Payment System processes any payment, THEN the Payment System SHALL log all validation steps, allocation calculations, and database operations
2. WHEN a payment is rejected, THEN the Payment System SHALL log the rejection reason and all validation failures
3. WHEN logging payment activities, THEN the Payment System SHALL include timestamps, user identifiers, and request metadata
4. WHEN an error occurs during payment processing, THEN the Payment System SHALL log the full error stack trace and context
5. WHEN querying payment history, THEN the Payment System SHALL provide filtering by client, loan contract, date range, and transaction status

### Requirement 10: Concurrent Payment Handling

**User Story:** As a system administrator, I want the system to handle concurrent payment attempts safely, so that race conditions do not cause data corruption.

#### Acceptance Criteria

1. WHEN multiple payment requests for the same loan contract arrive simultaneously, THEN the Payment System SHALL process them sequentially using database row-level locking
2. WHEN acquiring a lock on a loan contract record, THEN the Payment System SHALL use pessimistic locking to prevent concurrent modifications
3. WHEN a payment transaction is in progress, THEN the Payment System SHALL block other payment attempts for the same loan until the transaction completes
4. WHEN a lock timeout occurs, THEN the Payment System SHALL return an error indicating the system is busy and the client should retry
5. WHEN a payment transaction completes, THEN the Payment System SHALL release all locks immediately to allow subsequent payments
