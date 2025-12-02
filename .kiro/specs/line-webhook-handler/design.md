# LINE Webhook Payment Handler Design

## Overview

The LINE Webhook Payment Handler enhances the existing LINE image message handler to automatically process payment slips sent by clients via LINE. When a user sends a payment slip image, the system extracts the QR code, verifies the slip with SlipOK, matches the payment to a loan contract, processes the payment through the existing Payment Domain, and sends confirmation notifications back to the user via LINE.

This design integrates seamlessly with the existing payment processing system (specified in `.kiro/specs/payment-processing`) and leverages the current LINE messaging infrastructure. The handler acts as an orchestration layer that connects LINE webhook events to the payment processing workflow, providing clients with a convenient way to submit payments directly through LINE chat.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  LINE Messaging API                         │
│  (User sends payment slip image via LINE chat)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              LINE Webhook Endpoint                          │
│  POST /api/webhooks/line                                    │
│  - Signature verification                                   │
│  - Event routing                                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           ImageMessageHandler (Enhanced)                    │
│  - Download image from LINE                                 │
│  - Extract QR code                                          │
│  - Verify with SlipOK                                       │
│  - Match to loan contract                                   │
│  - Process payment                                          │
│  - Send notifications                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────┬──────────────────┬──────────────────────┐
│   QR Code Reader │  SlipOK Service  │  Payment Matching    │
│   (existing)     │  (existing)      │  Service (existing)  │
└──────────────────┴──────────────────┴──────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Payment Domain (existing)                      │
│  - Validate payment                                         │
│  - Allocate funds (waterfall)                               │
│  - Update loan balance                                      │
│  - Generate receipt                                         │
│  - Send notifications                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Database (PostgreSQL)                          │
│  - transactions                                             │
│  - loans                                                    │
│  - clients                                                  │
│  - connect_codes                                            │
│  - pending_payments                                         │
│  - slipok_logs                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. User sends payment slip image via LINE
                ↓
2. LINE webhook delivers image message event
                ↓
3. ImageMessageHandler.handle() invoked
                ↓
4. Download image from LINE servers
                ↓
5. Extract QR code from image
   - If no QR code → Reply "No QR code found" → END
                ↓
6. Verify slip with SlipOK
   - If verification fails → Reply "Verification failed" → END
                ↓
7. Extract payment data from SlipOK response
   (transRef, amount, date, time, sender, receiver)
                ↓
8. Match payment to loan contract
   - Try matching by LINE user ID
   - If no match → Store in pending_payments → Reply "Under review" → END
                ↓
9. Process payment via PaymentDomain.processPayment()
   - If duplicate → Reply "Already processed" → END
   - If error → Reply "Processing failed" → END
                ↓
10. Payment processed successfully
                ↓
11. Send confirmation message to user
    - Payment amount
    - Allocation breakdown
    - Remaining balance
    - Transaction reference
                ↓
12. If loan closed → Send congratulatory message
                ↓
END
```

## Components and Interfaces

### 1. Enhanced ImageMessageHandler

**File:** `api/src/features/line/handlers/image-message.handler.ts`

**Responsibilities:**
- Download images from LINE
- Extract QR codes from images
- Verify payment slips with SlipOK
- Match payments to loan contracts
- Trigger payment processing
- Send user notifications
- Handle errors gracefully

**Key Methods:**

```typescript
class ImageMessageHandler implements EventHandler {
  constructor(
    private readonly client: LineMessagingClient,
    private readonly replyUtil: LineReplyUtil,
    private readonly paymentDomain: PaymentDomain,
    private readonly matchingService: PaymentMatchingService,
    private readonly pendingPaymentsRepository: PendingPaymentsRepository
  ) {}

  /**
   * Handle image message event
   * Orchestrates the full payment slip processing workflow
   */
  async handle(event: LineEvent, context: EventContext): Promise<void>

  /**
   * Download image from LINE servers
   * @returns Buffer containing image data
   */
  private async downloadImage(messageId: string, userId: string): Promise<Buffer>

  /**
   * Extract and verify payment slip
   * @returns Verified payment data from SlipOK
   */
  private async extractAndVerifySlip(
    imageBuffer: Buffer,
    userId: string,
    messageId: string
  ): Promise<SlipOKVerificationResult | null>

  /**
   * Match payment to loan contract
   * @returns Matched loan or null if no match
   */
  private async matchPaymentToLoan(
    slipokData: SlipOKVerificationResult,
    lineUserId: string
  ): Promise<Loan | null>

  /**
   * Process payment through Payment Domain
   * @returns Payment result
   */
  private async processPayment(
    slipokData: SlipOKVerificationResult,
    loan: Loan
  ): Promise<PaymentResult>

  /**
   * Send payment confirmation to user
   */
  private async sendPaymentConfirmation(
    replyToken: string,
    userId: string,
    result: PaymentResult,
    slipokData: SlipOKVerificationResult
  ): Promise<void>

  /**
   * Handle unmatched payment
   * Stores in pending_payments and notifies user
   */
  private async handleUnmatchedPayment(
    slipokData: SlipOKVerificationResult,
    replyToken: string,
    userId: string
  ): Promise<void>

  /**
   * Send error message to user
   */
  private async sendErrorMessage(
    replyToken: string,
    userId: string,
    error: Error
  ): Promise<void>
}
```

### 2. Integration with Existing Services

**SlipOK Service** (existing - `api/src/features/slipok/slipok.service.ts`):
- `verifySlip(params)` - Verify payment slip and extract data

**Payment Domain** (existing - `api/src/features/payments/payments.domain.ts`):
- `processPayment(request)` - Process payment with full workflow

**Payment Matching Service** (existing - `api/src/features/payments/payment-matching.service.ts`):
- `findLoanForPayment(slipokData, lineUserId)` - Match payment to loan

**Pending Payments Repository** (existing - `api/src/features/payments/pending-payments.repository.ts`):
- `create(data)` - Store unmatched payment

**QR Code Reader** (existing - `api/src/utils/qrcode.ts`):
- `readQRCode(imageBuffer)` - Extract QR code from image

## Data Models

### SlipOK Verification Result

```typescript
interface SlipOKVerificationResult {
  success: boolean;
  data: {
    transRef: string;           // Transaction reference ID
    amount: number;             // Payment amount
    transDate: string;          // Format: DD/MM/YYYY
    transTime: string;          // Format: HH:MM:SS
    sendingBank: string;        // Bank code
    receivingBank: string;      // Bank code
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

### Payment Processing Request

```typescript
interface ProcessPaymentRequest {
  transactionRefId: string;
  loanId: string;
  amount: number;
  paymentDate: Date;
  paymentMethod?: string;
  paymentSource?: string;
  notes?: string;
}
```

### Payment Result

```typescript
interface PaymentResult {
  transactionId: string;
  allocation: PaymentAllocation;
  balanceAfter: number;
  principalRemaining: number;
  newStatus: string;
  receiptPath?: string;
}

interface PaymentAllocation {
  toPenalties: number;
  toInterest: number;
  toPrincipal: number;
  remaining: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Image Download Success

*For any* valid image message event from LINE, the handler should successfully download the image content from LINE servers and receive a non-empty buffer.

**Validates: Requirements 1.1**

### Property 2: QR Code Extraction

*For any* image containing a valid QR code, the handler should successfully extract the QR code data and pass it to SlipOK verification.

**Validates: Requirements 1.2, 1.4**

### Property 3: SlipOK Data Extraction Completeness

*For any* successful SlipOK verification response, the handler should extract all required fields: transaction reference ID, amount, payment date, payment time, sender information, and receiver information.

**Validates: Requirements 2.2**

### Property 4: Payment Matching Invocation

*For any* verified payment slip, the handler should invoke the Payment Matching Service to find the associated loan contract.

**Validates: Requirements 3.1**

### Property 5: LINE User ID Matching

*For any* payment where the sender's LINE user ID is linked to a client via connect codes, the handler should successfully match the payment to one of that client's active loans.

**Validates: Requirements 3.2**

### Property 6: Multiple Loan Selection

*For any* client with multiple active loans, the handler should select the loan with the earliest due date or highest outstanding balance for payment application.

**Validates: Requirements 3.4**

### Property 7: Payment Processing Invocation

*For any* successfully matched payment, the handler should invoke the Payment Domain's processPayment method with all required transaction data.

**Validates: Requirements 3.5, 4.1**

### Property 8: Payment Processing Parameters Completeness

*For any* payment processing invocation, the handler should pass all required parameters: transaction reference ID, loan ID, payment amount, payment date, payment method, and payment source.

**Validates: Requirements 4.2**

### Property 9: Payment Result Completeness

*For any* successful payment processing, the handler should receive a result containing transaction ID, allocation breakdown, and new balance.

**Validates: Requirements 4.3**

### Property 10: Payment Confirmation Delivery

*For any* successfully processed payment, the handler should send a LINE confirmation message to the user.

**Validates: Requirements 5.1**

### Property 11: Confirmation Message Completeness

*For any* payment confirmation message, the handler should include payment amount, allocation breakdown (penalties, interest, principal), remaining balance, and transaction reference ID.

**Validates: Requirements 5.2**

### Property 12: Error Logging Completeness

*For any* error occurring during payment processing, the handler should log detailed information including user ID, image message ID, and error details.

**Validates: Requirements 6.1**

### Property 13: Verification Failure Stops Processing

*For any* payment slip where SlipOK verification fails, the handler should not proceed to payment processing and should inform the user of the failure.

**Validates: Requirements 6.2**

### Property 14: Matching Failure Creates Pending Payment

*For any* payment that cannot be matched to a loan contract, the handler should store the payment data in the pending_payments table for manual review.

**Validates: Requirements 6.3**

### Property 15: Payment Domain Error Handling

*For any* error thrown by the Payment Domain, the handler should catch the error and send a user-friendly error message without crashing.

**Validates: Requirements 6.4**

### Property 16: Notification Failure Resilience

*For any* payment where user notification fails, the handler should log the failure but not roll back or fail the payment transaction.

**Validates: Requirements 6.5**

### Property 17: Image Message Logging

*For any* received image message, the handler should log the user ID, message ID, and image size.

**Validates: Requirements 7.1**

### Property 18: QR Extraction Logging

*For any* QR code extraction attempt (success or failure), the handler should log the result with relevant details.

**Validates: Requirements 7.2**

### Property 19: SlipOK Verification Logging

*For any* SlipOK verification performed, the handler should log the verification request and response.

**Validates: Requirements 7.3**

### Property 20: Payment Matching Logging

*For any* payment matching attempt, the handler should log the matching strategy used and the result.

**Validates: Requirements 7.4**

### Property 21: Payment Completion Logging

*For any* completed payment, the handler should log the transaction ID, allocation breakdown, and final balance.

**Validates: Requirements 7.5**

### Property 22: Duplicate Detection Delegation

*For any* payment slip with a transaction reference ID, the handler should rely on the Payment Domain's duplicate detection mechanism.

**Validates: Requirements 8.1**

### Property 23: Duplicate Notification

*For any* payment where the Payment Domain detects a duplicate transaction, the handler should inform the user that the payment was already processed.

**Validates: Requirements 8.2**

### Property 24: Idempotent Processing

*For any* payment slip sent multiple times by the same user, the handler should process it only once based on the transaction reference ID, with subsequent attempts returning the original transaction details.

**Validates: Requirements 8.3, 8.4**

### Property 25: Duplicate Attempt Logging

*For any* duplicate payment attempt, the handler should log the user ID and timestamp for audit purposes.

**Validates: Requirements 8.5**

### Property 26: Notification Service Integration

*For any* successfully processed payment via LINE image handler, the Payment Domain should send notifications using the existing Payment Notification Service.

**Validates: Requirements 9.1**

### Property 27: Receipt Path in Notification

*For any* payment where a receipt is generated, the handler should ensure the receipt path is included in the user notification.

**Validates: Requirements 9.2**

### Property 28: Status Change Notifications

*For any* payment that causes a loan status change, the handler should ensure status change notifications are sent to the user.

**Validates: Requirements 9.3**

### Property 29: LINE User ID in Notifications

*For any* notification service invocation, the handler should pass the client's LINE user ID for notification delivery.

**Validates: Requirements 9.4**

### Property 30: Immediate Acknowledgment

*For any* received image message, the handler should send an immediate acknowledgment message to the user indicating that processing has started.

**Validates: Requirements 10.1**

## Error Handling

### Error Types and Responses

| Error Type | User Message | Action |
|------------|-------------|--------|
| No QR Code Found | "ไม่พบ QR Code ในรูปภาพ กรุณาส่งรูปภาพสลิปที่มี QR Code เพื่อตรวจสอบ" | Log and end |
| Image Too Large | "รูปภาพมีขนาดใหญ่เกินไป กรุณาส่งรูปภาพที่มีขนาดไม่เกิน 10MB" | Log and end |
| SlipOK Verification Failed | "❌ ตรวจสอบสลิปไม่สำเร็จ: [reason]" | Log and end |
| SlipOK Service Unavailable | "ระบบตรวจสอบสลิปไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้งในภายหลัง" | Log and end |
| Payment Not Matched | "ได้รับข้อมูลการชำระเงินของคุณแล้ว กำลังตรวจสอบ เจ้าหน้าที่จะติดต่อกลับภายใน 24 ชั่วโมง" | Store in pending_payments |
| Duplicate Transaction | "การชำระเงินนี้ได้รับการประมวลผลแล้ว\nรหัสอ้างอิง: [transRef]\nรหัสธุรกรรม: [transactionId]" | Return original details |
| Payment Processing Failed | "เกิดข้อผิดพลาดในการประมวลผลการชำระเงิน กรุณาติดต่อเจ้าหน้าที่" | Log error details |
| Loan Closed | "สัญญานี้ปิดแล้ว ไม่สามารถรับชำระเงินได้" | Log and end |
| Download Failed | "ไม่สามารถดาวน์โหลดรูปภาพได้ กรุณาลองใหม่" | Log and end |

### Error Handling Strategy

1. **Validation Errors**: Return user-friendly message, log details, end processing
2. **External Service Errors**: Retry once if transient, otherwise inform user to try later
3. **Matching Errors**: Store in pending_payments, notify user of manual review
4. **Processing Errors**: Log full details, send generic error message to user
5. **Notification Errors**: Log but don't fail payment transaction

### Logging Strategy

All operations should be logged with structured data:

```typescript
logger.info({
  event: "image_message_received",
  userId: string,
  messageId: string,
  imageSize: number,
}, "Image message received from LINE user");

logger.info({
  event: "qr_code_extracted",
  userId: string,
  messageId: string,
  qrDataLength: number,
}, "QR code extracted successfully");

logger.info({
  event: "slipok_verification_success",
  userId: string,
  messageId: string,
  transRef: string,
  amount: number,
}, "SlipOK verification successful");

logger.info({
  event: "payment_matched",
  userId: string,
  transRef: string,
  loanId: string,
  contractNumber: string,
}, "Payment matched to loan contract");

logger.info({
  event: "payment_processed",
  userId: string,
  transRef: string,
  transactionId: string,
  amount: number,
  allocation: PaymentAllocation,
  balanceAfter: number,
}, "Payment processed successfully");

logger.error({
  event: "payment_processing_failed",
  userId: string,
  transRef: string,
  error: string,
  stack: string,
}, "Payment processing failed");
```

## Testing Strategy

### Unit Testing

Unit tests will cover:

1. **Image Download**
   - Test successful download from LINE
   - Test download failure handling
   - Test image size validation

2. **QR Code Extraction**
   - Test extraction from valid images
   - Test handling of images without QR codes
   - Test handling of corrupted images

3. **SlipOK Integration**
   - Test successful verification
   - Test verification failure handling
   - Test data extraction from response

4. **Payment Matching**
   - Test matching by LINE user ID
   - Test handling of unmatched payments
   - Test multiple loan selection logic

5. **Error Handling**
   - Test each error type produces correct user message
   - Test error logging includes required fields
   - Test notification failures don't fail payments

### Property-Based Testing

The system will use **fast-check** library for property-based testing. Each correctness property will be implemented as a property-based test with a minimum of 100 iterations.

**Property-based test requirements:**
- Each test must run at least 100 iterations
- Each test must be tagged with: `// Feature: line-webhook-handler, Property X: [property text]`
- Each correctness property must be implemented by a SINGLE property-based test
- Tests should use smart generators that create realistic test data

**Example property test structure:**

```typescript
import fc from 'fast-check';

// Feature: line-webhook-handler, Property 8: Payment Processing Parameters Completeness
test('processPayment is called with all required parameters', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        transRef: fc.string({ minLength: 10 }),
        amount: fc.float({ min: 1, max: 1000000 }),
        loanId: fc.uuid(),
        // ... other fields
      }),
      async (paymentData) => {
        // Test that all required parameters are passed
        // when processPayment is invoked
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

Integration tests will verify:
1. End-to-end flow from image message to payment confirmation
2. Integration with SlipOK service (with mock)
3. Integration with Payment Domain
4. Integration with LINE Messaging API (with mock)
5. Database operations for pending payments

### Test Database

Use a separate test database with:
- Same schema as production
- Seed data for test clients, loans, and connect codes
- Automatic cleanup between tests

## Implementation Notes

### Dependencies

No new dependencies required. The implementation uses existing services:
- `LineMessagingClient` - Already exists
- `SlipOKService` - Already exists
- `PaymentDomain` - Already exists
- `PaymentMatchingService` - Already exists
- `PendingPaymentsRepository` - Already exists
- `readQRCode` utility - Already exists

### Configuration

No new configuration required. Uses existing config:
- `config.line.channelAccessToken`
- `config.slipok.apiKey`
- `config.payment.receiptStoragePath`

### File Modifications

**Primary file to modify:**
- `api/src/features/line/handlers/image-message.handler.ts`

**Files to import from:**
- `api/src/features/payments/payments.domain.ts`
- `api/src/features/payments/payment-matching.service.ts`
- `api/src/features/payments/pending-payments.repository.ts`
- `api/src/features/slipok/slipok.service.ts`
- `api/src/utils/qrcode.ts`

### Performance Considerations

1. **Async Processing**: All operations are async to avoid blocking
2. **Early Acknowledgment**: Send immediate reply to user before processing
3. **Error Isolation**: Errors in one step don't affect previous steps
4. **Logging**: Use structured logging for efficient querying
5. **Idempotency**: Duplicate detection prevents redundant processing

### Security Considerations

1. **LINE Signature Verification**: Already handled by middleware
2. **Image Size Limits**: Enforce 10MB maximum
3. **SlipOK API Key**: Stored securely in environment variables
4. **Transaction Reference Validation**: Validated by Payment Domain
5. **Authorization**: Only process payments for authenticated LINE users

### User Experience

**Success Flow:**
1. User sends slip image
2. Immediate reply: "ได้รับรูปภาพของคุณเรียบร้อยแล้ว กำลังดำเนินการตรวจสอบ"
3. Processing (2-5 seconds)
4. Confirmation: "✅ ชำระเงินสำเร็จ\n💰 จำนวน: X บาท\n📊 การจัดสรร: ...\n💳 คงเหลือ: Y บาท"

**Failure Flow:**
1. User sends slip image
2. Immediate reply: "ได้รับรูปภาพของคุณเรียบร้อยแล้ว กำลังดำเนินการตรวจสอบ"
3. Processing
4. Error message: Specific error based on failure type

**Unmatched Flow:**
1. User sends slip image
2. Immediate reply: "ได้รับรูปภาพของคุณเรียบร้อยแล้ว กำลังดำเนินการตรวจสอบ"
3. Processing
4. Pending message: "ได้รับข้อมูลการชำระเงินของคุณแล้ว กำลังตรวจสอบ เจ้าหน้าที่จะติดต่อกลับภายใน 24 ชั่วโมง"
