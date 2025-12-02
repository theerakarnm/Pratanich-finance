# Requirements Document

## Introduction

This document specifies the requirements for enhancing the LINE webhook image handler to process payment slips directly through the existing payment processing system. Currently, when users send payment slip images via LINE, the system only verifies the slip with SlipOK and displays the verification result. The enhanced system must extract payment data from the slip image, match it to a loan contract, and trigger the complete payment processing workflow including balance updates, receipt generation, and notifications.

## Glossary

- **LINE Webhook**: An HTTP endpoint that receives events from the LINE Messaging API when users interact with the LINE bot
- **Image Message Handler**: The component responsible for processing image messages sent by users via LINE
- **Payment Slip**: A bank transfer receipt image containing a QR code with transaction details
- **QR Code**: A machine-readable code embedded in payment slips containing transaction reference and payment data
- **SlipOK Service**: An external service that verifies Thai bank payment slips and extracts transaction data
- **Payment Processing System**: The existing system component that handles payment allocation, loan updates, and notifications
- **Payment Matching Service**: The component that matches incoming payments to loan contracts
- **Transaction Reference ID**: A unique identifier for each payment transaction extracted from the payment slip

## Requirements

### Requirement 1: Image Message Reception and QR Code Extraction

**User Story:** As a client, I want to send my payment slip image via LINE, so that my payment can be automatically processed without manual intervention.

#### Acceptance Criteria

1. WHEN a user sends an image message via LINE, THEN the Image Message Handler SHALL download the image content from LINE servers
2. WHEN the image is downloaded, THEN the Image Message Handler SHALL extract the QR code data from the image using the QR code reader utility
3. IF no QR code is found in the image, THEN the Image Message Handler SHALL reply to the user with a message indicating no QR code was detected
4. WHEN a QR code is successfully extracted, THEN the Image Message Handler SHALL pass the QR code data to the SlipOK verification service
5. WHEN the image exceeds the maximum size limit, THEN the Image Message Handler SHALL reject the image and inform the user

### Requirement 2: Payment Slip Verification with SlipOK

**User Story:** As a system administrator, I want payment slips to be verified for authenticity, so that only legitimate bank transfers are processed.

#### Acceptance Criteria

1. WHEN QR code data is extracted from an image, THEN the Image Message Handler SHALL send the data to SlipOK for verification
2. WHEN SlipOK verification succeeds, THEN the Image Message Handler SHALL extract the transaction reference ID, amount, payment date, payment time, sender information, and receiver information from the verification result
3. IF SlipOK verification fails, THEN the Image Message Handler SHALL reply to the user with an error message indicating the slip could not be verified
4. WHEN SlipOK returns invalid or incomplete data, THEN the Image Message Handler SHALL log the error and inform the user that verification failed
5. WHEN SlipOK service is unavailable, THEN the Image Message Handler SHALL handle the error gracefully and inform the user to try again later

### Requirement 3: Payment Matching to Loan Contract

**User Story:** As a system administrator, I want incoming payments to be automatically matched to the correct loan contract, so that payments are applied to the right client account.

#### Acceptance Criteria

1. WHEN a payment slip is verified, THEN the Image Message Handler SHALL use the Payment Matching Service to find the associated loan contract
2. WHEN matching by LINE user ID, THEN the Image Message Handler SHALL look up the client associated with the sender's LINE user ID via the connect codes table
3. IF no loan contract can be matched, THEN the Image Message Handler SHALL store the payment in the pending payments table and notify the user that manual review is required
4. WHEN multiple active loans exist for a client, THEN the Image Message Handler SHALL select the loan with the earliest due date or highest outstanding balance
5. WHEN a loan contract is successfully matched, THEN the Image Message Handler SHALL proceed to payment processing

### Requirement 4: Payment Processing Integration

**User Story:** As a client, I want my payment to be automatically processed when I send a slip image, so that my loan balance is updated immediately.

#### Acceptance Criteria

1. WHEN a payment is matched to a loan contract, THEN the Image Message Handler SHALL invoke the Payment Domain's processPayment method with the transaction data
2. WHEN invoking payment processing, THEN the Image Message Handler SHALL pass the transaction reference ID, loan ID, payment amount, payment date, payment method, and payment source
3. WHEN payment processing succeeds, THEN the Image Message Handler SHALL receive the payment result including transaction ID, allocation breakdown, and new balance
4. IF payment processing fails due to duplicate transaction, THEN the Image Message Handler SHALL inform the user that the payment was already processed
5. IF payment processing fails for any other reason, THEN the Image Message Handler SHALL log the error and inform the user that processing failed

### Requirement 5: User Notification and Feedback

**User Story:** As a client, I want to receive immediate feedback after sending my payment slip, so that I know whether my payment was processed successfully.

#### Acceptance Criteria

1. WHEN payment processing succeeds, THEN the Image Message Handler SHALL send a LINE message to the user with payment confirmation details
2. WHEN sending payment confirmation, THEN the Image Message Handler SHALL include the payment amount, allocation breakdown (penalties, interest, principal), remaining balance, and transaction reference ID
3. IF the payment closes the loan (balance reaches zero), THEN the Image Message Handler SHALL send a congratulatory message indicating the loan is fully paid
4. WHEN payment processing fails, THEN the Image Message Handler SHALL send an error message explaining why the payment could not be processed
5. WHEN a payment cannot be matched and is stored as pending, THEN the Image Message Handler SHALL inform the user that their payment is under review and they will be contacted

### Requirement 6: Error Handling and Resilience

**User Story:** As a system administrator, I want the system to handle errors gracefully, so that temporary failures do not result in lost payments or poor user experience.

#### Acceptance Criteria

1. WHEN any step in the payment processing workflow fails, THEN the Image Message Handler SHALL log detailed error information including user ID, image message ID, and error details
2. WHEN SlipOK verification fails, THEN the Image Message Handler SHALL NOT proceed to payment processing
3. WHEN payment matching fails, THEN the Image Message Handler SHALL store the payment data in pending payments for manual review
4. WHEN the Payment Domain throws an error, THEN the Image Message Handler SHALL catch the error and send an appropriate user-friendly message
5. WHEN sending user notifications fails, THEN the Image Message Handler SHALL log the failure but NOT fail the overall payment processing

### Requirement 7: Audit Trail and Logging

**User Story:** As a system administrator, I want comprehensive logging of all payment slip processing, so that I can troubleshoot issues and maintain compliance.

#### Acceptance Criteria

1. WHEN an image message is received, THEN the Image Message Handler SHALL log the user ID, message ID, and image size
2. WHEN QR code extraction succeeds or fails, THEN the Image Message Handler SHALL log the result with relevant details
3. WHEN SlipOK verification is performed, THEN the Image Message Handler SHALL log the verification request and response
4. WHEN payment matching is attempted, THEN the Image Message Handler SHALL log the matching strategy used and the result
5. WHEN payment processing completes, THEN the Image Message Handler SHALL log the transaction ID, allocation, and final balance

### Requirement 8: Idempotency and Duplicate Prevention

**User Story:** As a system administrator, I want the system to prevent duplicate payment processing, so that clients are not charged multiple times for the same payment.

#### Acceptance Criteria

1. WHEN a payment slip with a transaction reference ID is processed, THEN the Image Message Handler SHALL rely on the Payment Domain's duplicate detection
2. WHEN the Payment Domain detects a duplicate transaction, THEN the Image Message Handler SHALL inform the user that the payment was already processed
3. WHEN a user sends the same slip image multiple times, THEN the Image Message Handler SHALL process it only once based on the transaction reference ID
4. WHEN duplicate detection occurs, THEN the Image Message Handler SHALL return the original transaction details to the user
5. WHEN logging duplicate attempts, THEN the Image Message Handler SHALL record the user ID and timestamp for audit purposes

### Requirement 9: Integration with Existing Payment Notification System

**User Story:** As a client, I want to receive the same detailed payment notifications regardless of how I submit my payment, so that I have consistent confirmation and receipts.

#### Acceptance Criteria

1. WHEN payment processing succeeds via LINE image handler, THEN the Payment Domain SHALL send LINE notifications using the existing Payment Notification Service
2. WHEN a receipt is generated, THEN the Image Message Handler SHALL ensure the receipt path is included in the user notification
3. WHEN the loan status changes due to payment, THEN the Image Message Handler SHALL ensure status change notifications are sent
4. WHEN the Payment Notification Service is invoked, THEN the Image Message Handler SHALL pass the client's LINE user ID for notification delivery
5. WHEN notification delivery fails, THEN the Image Message Handler SHALL log the failure but NOT roll back the payment transaction

### Requirement 10: Performance and Responsiveness

**User Story:** As a client, I want my payment slip to be processed quickly, so that I receive confirmation without long delays.

#### Acceptance Criteria

1. WHEN an image message is received, THEN the Image Message Handler SHALL send an immediate acknowledgment message to the user indicating processing has started
2. WHEN QR code extraction and SlipOK verification complete, THEN the Image Message Handler SHALL send a status update within 5 seconds
3. WHEN payment processing completes, THEN the Image Message Handler SHALL send the final confirmation within 10 seconds of receiving the image
4. WHEN processing takes longer than expected, THEN the Image Message Handler SHALL send intermediate status messages to keep the user informed
5. WHEN the system is under heavy load, THEN the Image Message Handler SHALL queue image processing requests and process them in order
