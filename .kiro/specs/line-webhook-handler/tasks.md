# Implementation Plan

- [x] 1. Refactor ImageMessageHandler constructor to accept payment dependencies
  - Add PaymentDomain, PaymentMatchingService, and PendingPaymentsRepository as constructor parameters
  - Update the handler instantiation in line.router.ts to inject these dependencies
  - Ensure backward compatibility with existing image handling functionality
  - _Requirements: All requirements - foundational change_

- [x] 2. Implement QR code extraction and SlipOK verification flow
  - Create extractAndVerifySlip() private method
  - Call readQRCode() utility to extract QR data from image buffer
  - Handle case where no QR code is found (send user message and return null)
  - Call SlipOKService.verifySlip() with extracted QR data
  - Handle SlipOK verification failures (send error message to user)
  - Extract and validate all required fields from SlipOK response
  - Return SlipOKVerificationResult or null
  - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 2.1 Write property test for QR extraction
  - **Property 2: QR Code Extraction**
  - **Validates: Requirements 1.2, 1.4**

- [ ]* 2.2 Write property test for SlipOK data extraction
  - **Property 3: SlipOK Data Extraction Completeness**
  - **Validates: Requirements 2.2**

- [x] 3. Implement payment matching logic
  - Create matchPaymentToLoan() private method
  - Call PaymentMatchingService.findLoanForPayment() with SlipOK data and LINE user ID
  - Handle PaymentMatchingError when no loan can be matched
  - Log matching strategy and result
  - Return matched Loan or null
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ]* 3.1 Write property test for payment matching invocation
  - **Property 4: Payment Matching Invocation**
  - **Validates: Requirements 3.1**

- [ ]* 3.2 Write property test for LINE user ID matching
  - **Property 5: LINE User ID Matching**
  - **Validates: Requirements 3.2**

- [ ]* 3.3 Write property test for multiple loan selection
  - **Property 6: Multiple Loan Selection**
  - **Validates: Requirements 3.4**

- [x] 4. Implement unmatched payment handling
  - Create handleUnmatchedPayment() private method
  - Parse SlipOK date/time into Date object
  - Create pending payment record via PendingPaymentsRepository.create()
  - Log pending payment creation with details
  - Send user message: "ได้รับข้อมูลการชำระเงินของคุณแล้ว กำลังตรวจสอบ เจ้าหน้าที่จะติดต่อกลับภายใน 24 ชั่วโมง"
  - _Requirements: 3.3, 6.3_

- [ ]* 4.1 Write property test for matching failure creates pending payment
  - **Property 14: Matching Failure Creates Pending Payment**
  - **Validates: Requirements 6.3**

- [x] 5. Implement payment processing integration
  - Create processPayment() private method
  - Parse SlipOK date/time strings into Date object
  - Build ProcessPaymentRequest with all required fields
  - Call PaymentDomain.processPayment() with request
  - Handle DuplicateTransactionError (inform user payment already processed)
  - Handle other payment errors (log and send error message)
  - Return PaymentResult
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 5.1 Write property test for payment processing invocation
  - **Property 7: Payment Processing Invocation**
  - **Validates: Requirements 3.5, 4.1**

- [ ]* 5.2 Write property test for payment parameters completeness
  - **Property 8: Payment Processing Parameters Completeness**
  - **Validates: Requirements 4.2**

- [ ]* 5.3 Write property test for payment result completeness
  - **Property 9: Payment Result Completeness**
  - **Validates: Requirements 4.3**

- [x] 6. Implement payment confirmation messaging
  - Create sendPaymentConfirmation() private method
  - Format confirmation message with payment amount, allocation breakdown, remaining balance, and transaction reference
  - Send confirmation via replyUtil.replyText()
  - Check if loan status is "Closed" and balance is zero
  - If loan closed, send additional congratulatory message
  - Handle notification failures gracefully (log but don't throw)
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]* 6.1 Write property test for payment confirmation delivery
  - **Property 10: Payment Confirmation Delivery**
  - **Validates: Requirements 5.1**

- [ ]* 6.2 Write property test for confirmation message completeness
  - **Property 11: Confirmation Message Completeness**
  - **Validates: Requirements 5.2**

- [x] 7. Implement comprehensive error handling
  - Update sendErrorMessage() method to handle all error types
  - Map error types to user-friendly Thai messages
  - Ensure all errors are logged with required context (userId, messageId, error details)
  - Catch Payment Domain errors and send appropriate messages
  - Ensure notification failures don't fail payment transactions
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [ ]* 7.1 Write property test for error logging completeness
  - **Property 12: Error Logging Completeness**
  - **Validates: Requirements 6.1**

- [ ]* 7.2 Write property test for verification failure stops processing
  - **Property 13: Verification Failure Stops Processing**
  - **Validates: Requirements 6.2**

- [ ]* 7.3 Write property test for Payment Domain error handling
  - **Property 15: Payment Domain Error Handling**
  - **Validates: Requirements 6.4**

- [ ]* 7.4 Write property test for notification failure resilience
  - **Property 16: Notification Failure Resilience**
  - **Validates: Requirements 6.5**

- [x] 8. Implement comprehensive logging throughout workflow
  - Add structured logging at each major step
  - Log image message receipt with userId, messageId, imageSize
  - Log QR extraction result (success/failure)
  - Log SlipOK verification request and response
  - Log payment matching attempt with strategy and result
  - Log payment processing completion with transaction details
  - Log duplicate attempts with userId and timestamp
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.5_

- [ ]* 8.1 Write property test for image message logging
  - **Property 17: Image Message Logging**
  - **Validates: Requirements 7.1**

- [ ]* 8.2 Write property test for QR extraction logging
  - **Property 18: QR Extraction Logging**
  - **Validates: Requirements 7.2**

- [ ]* 8.3 Write property test for SlipOK verification logging
  - **Property 19: SlipOK Verification Logging**
  - **Validates: Requirements 7.3**

- [ ]* 8.4 Write property test for payment matching logging
  - **Property 20: Payment Matching Logging**
  - **Validates: Requirements 7.4**

- [ ]* 8.5 Write property test for payment completion logging
  - **Property 21: Payment Completion Logging**
  - **Validates: Requirements 7.5**

- [-] 9. Implement duplicate transaction handling
  - Rely on Payment Domain's duplicate detection (no changes needed in handler)
  - When DuplicateTransactionError is caught, extract transaction details
  - Send user message with original transaction reference and ID
  - Log duplicate attempt with userId and timestamp
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 9.1 Write property test for duplicate detection delegation
  - **Property 22: Duplicate Detection Delegation**
  - **Validates: Requirements 8.1**

- [ ]* 9.2 Write property test for duplicate notification
  - **Property 23: Duplicate Notification**
  - **Validates: Requirements 8.2**

- [ ]* 9.3 Write property test for idempotent processing
  - **Property 24: Idempotent Processing**
  - **Validates: Requirements 8.3, 8.4**

- [ ]* 9.4 Write property test for duplicate attempt logging
  - **Property 25: Duplicate Attempt Logging**
  - **Validates: Requirements 8.5**

- [x] 10. Refactor main handle() method to orchestrate complete workflow
  - Remove old SlipOK verification code that only displays results
  - Add immediate acknowledgment message: "ได้รับรูปภาพของคุณเรียบร้อยแล้ว กำลังดำเนินการตรวจสอบ"
  - Call extractAndVerifySlip() and handle null result
  - Call matchPaymentToLoan() and handle null result (call handleUnmatchedPayment)
  - Call processPayment() and handle errors
  - Call sendPaymentConfirmation() with result
  - Wrap entire flow in try-catch with comprehensive error handling
  - _Requirements: All requirements - main orchestration_

- [ ]* 10.1 Write property test for immediate acknowledgment
  - **Property 30: Immediate Acknowledgment**
  - **Validates: Requirements 10.1**

- [x] 11. Update handler instantiation in line.router.ts
  - Import PaymentDomain, PaymentMatchingService, PendingPaymentsRepository
  - Create instances of these services
  - Pass instances to ImageMessageHandler constructor
  - Ensure proper dependency injection
  - _Requirements: All requirements - wiring_

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ]* 13. Write integration tests for end-to-end flow
  - Test complete flow from image message to payment confirmation
  - Test unmatched payment flow (stored in pending_payments)
  - Test duplicate transaction flow
  - Test various error scenarios
  - Use test database with seed data
  - Mock LINE API and SlipOK service
  - _Requirements: All requirements_

- [ ]* 14. Write unit tests for helper methods
  - Test extractAndVerifySlip with various image types
  - Test matchPaymentToLoan with different matching scenarios
  - Test handleUnmatchedPayment creates correct pending payment
  - Test sendPaymentConfirmation formats messages correctly
  - Test error message formatting for all error types
  - _Requirements: All requirements_
