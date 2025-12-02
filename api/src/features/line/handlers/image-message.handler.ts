import { logger } from '../../../core/logger';
import type { EventHandler } from '../line.router';
import type { LineEvent, LineMessageEvent, EventContext } from '../line.types';
import type { LineMessagingClient } from '../line.client';
import type { LineReplyUtil } from '../utils/line-reply.util';
import { readQRCode } from '../../../utils/qrcode';
import { SlipOKService } from '../../slipok/slipok.service';
import type { PaymentDomain } from '../../payments/payments.domain';
import type { PaymentMatchingService } from '../../payments/payment-matching.service';
import type { PendingPaymentsRepository } from '../../payments/pending-payments.repository';
import { 
  PaymentMatchingError, 
  DuplicateTransactionError,
  PaymentValidationError,
  LoanNotFoundError,
  InvalidLoanStatusError,
  PaymentProcessingError
} from '../../payments/payments.errors';
import type { loans } from '../../../core/database/schema';
import type { ProcessPaymentRequest, PaymentResult } from '../../payments/payments.types';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

// Extend dayjs with custom parse format plugin
dayjs.extend(customParseFormat);

/**
 * SlipOK Verification Result structure
 */
interface SlipOKVerificationResult {
  transRef: string;
  amount: number;
  transDate: string;
  transTime: string;
  sendingBank: string;
  receivingBank: string;
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
}

/**
 * Error messages mapped to user-friendly Thai messages
 * Maps error types to appropriate user-facing messages
 */
const ERROR_MESSAGES = {
  // Image-related errors
  IMAGE_ERROR: 'ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่',
  IMAGE_TOO_LARGE: 'รูปภาพมีขนาดใหญ่เกินไป กรุณาส่งรูปภาพที่มีขนาดไม่เกิน 10MB',
  DOWNLOAD_ERROR: 'ไม่สามารถดาวน์โหลดรูปภาพได้ กรุณาลองใหม่',
  
  // QR and SlipOK errors
  NO_QR_CODE: 'ไม่พบ QR Code ในรูปภาพ กรุณาส่งรูปภาพสลิปที่มี QR Code เพื่อตรวจสอบ',
  SLIPOK_VERIFICATION_FAILED: '❌ ตรวจสอบสลิปไม่สำเร็จ กรุณาตรวจสอบว่าเป็นสลิปที่ถูกต้องและลองใหม่อีกครั้ง',
  SLIPOK_SERVICE_UNAVAILABLE: 'ระบบตรวจสอบสลิปไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้งในภายหลัง',
  SLIPOK_DATA_INCOMPLETE: '❌ ข้อมูลสลิปไม่สมบูรณ์ กรุณาส่งสลิปที่ชัดเจนและลองใหม่',
  
  // Payment matching errors
  PAYMENT_NOT_MATCHED: 'ได้รับข้อมูลการชำระเงินของคุณแล้ว กำลังตรวจสอบ เจ้าหน้าที่จะติดต่อกลับภายใน 24 ชั่วโมง',
  
  // Payment processing errors
  DUPLICATE_TRANSACTION: 'การชำระเงินนี้ได้รับการประมวลผลแล้ว',
  PAYMENT_VALIDATION_ERROR: 'ข้อมูลการชำระเงินไม่ถูกต้อง กรุณาติดต่อเจ้าหน้าที่',
  LOAN_NOT_FOUND: 'ไม่พบข้อมูลสัญญา กรุณาติดต่อเจ้าหน้าที่',
  LOAN_CLOSED: 'สัญญานี้ปิดแล้ว ไม่สามารถรับชำระเงินได้',
  INVALID_LOAN_STATUS: 'สถานะสัญญาไม่สามารถรับชำระเงินได้ กรุณาติดต่อเจ้าหน้าที่',
  PAYMENT_PROCESSING_FAILED: 'เกิดข้อผิดพลาดในการประมวลผลการชำระเงิน กรุณาติดต่อเจ้าหน้าที่',
  
  // Generic errors
  PROCESSING_ERROR: 'เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่หรือติดต่อเจ้าหน้าที่',
  UNKNOWN_ERROR: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาติดต่อเจ้าหน้าที่',
};

/**
 * Image Message Handler
 * Processes image message events from LINE users
 * Downloads, validates, and processes image content
 * Implements EventHandler interface for strategy pattern
 */
export class ImageMessageHandler implements EventHandler {
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(
    private readonly client: LineMessagingClient,
    private readonly replyUtil: LineReplyUtil,
    private readonly paymentDomain: PaymentDomain,
    private readonly matchingService: PaymentMatchingService,
    private readonly pendingPaymentsRepository: PendingPaymentsRepository
  ) { }

  /**
   * Determines if this handler can process the given event
   * @param event - The LINE event to check
   * @returns true if event is an image message event
   */
  canHandle(event: LineEvent): boolean {
    return (
      event.type === 'message' &&
      'message' in event &&
      event.message.type === 'image'
    );
  }

  /**
   * Processes image message events
   * Extracts message ID, downloads image content, validates size, and processes image
   * @param event - The LINE message event
   * @param context - Event context with reply token and user info
   */
  async handle(event: LineEvent, context: EventContext): Promise<void> {
    // Type guard to ensure we have a message event
    if (!this.canHandle(event)) {
      throw new Error('ImageMessageHandler cannot handle this event type');
    }

    const messageEvent = event as LineMessageEvent;
    const imageMessage = messageEvent.message;

    // Type guard for image message
    if (imageMessage.type !== 'image') {
      throw new Error('Expected image message but got different type');
    }

    const messageId = imageMessage.id;
    const userId = context.userId;
    const replyToken = context.replyToken;
    const contentProvider = imageMessage.contentProvider;

    try {
      // Send immediate acknowledgment message (Requirement 10.1)
      await this.replyUtil.replyText(
        replyToken,
        'ได้รับรูปภาพของคุณเรียบร้อยแล้ว กำลังดำเนินการตรวจสอบ',
        userId
      );

      logger.info(
        {
          event: 'immediate_acknowledgment_sent',
          userId,
          messageId,
        },
        'Immediate acknowledgment sent to user'
      );

      // Download image content from LINE
      const imageBuffer = await this.downloadImage(messageId, userId);

      // Log image message receipt with all required details (Requirement 7.1)
      logger.info(
        {
          event: 'image_message_received',
          userId,
          messageId,
          imageSize: imageBuffer.length,
        },
        'Image message received and downloaded from LINE'
      );

      // Validate image size
      this.validateImageSize(imageBuffer, messageId, userId);

      // Process the image through complete workflow
      await this.processImage(imageBuffer, messageId, userId, replyToken);

      logger.info(
        {
          event: 'image_message_processing_completed',
          userId,
          messageId,
          imageSize: imageBuffer.length,
        },
        'Image message processing completed successfully'
      );
    } catch (error) {
      // Comprehensive error handling with logging
      logger.error(
        {
          event: 'image_message_processing_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
          userId,
          messageId,
        },
        'Error processing image message'
      );

      // Send appropriate error message to user
      await this.sendErrorMessage(replyToken, userId, messageId, error);
    }
  }

  /**
   * Downloads image content from LINE
   * @param messageId - The message ID of the image
   * @param userId - The LINE user ID for logging
   * @returns Buffer containing image data
   * @throws Error if download fails
   */
  private async downloadImage(
    messageId: string,
    userId: string
  ): Promise<Buffer> {
    try {
      logger.debug({ userId, messageId }, 'Downloading image from LINE');

      const { content: imageBuffer } = await this.client.getMessageContent(messageId);

      logger.info(
        {
          userId,
          messageId,
          size: imageBuffer.length,
        },
        'Image downloaded successfully'
      );

      return imageBuffer;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          messageId,
        },
        'Failed to download image from LINE'
      );

      throw new Error('DOWNLOAD_ERROR');
    }
  }

  /**
   * Validates that image size does not exceed maximum allowed size
   * @param imageBuffer - The image data buffer
   * @param messageId - The message ID for logging
   * @param userId - The LINE user ID for logging
   * @throws Error if image exceeds maximum size
   */
  private validateImageSize(
    imageBuffer: Buffer,
    messageId: string,
    userId: string
  ): void {
    const imageSize = imageBuffer.length;

    logger.debug(
      {
        userId,
        messageId,
        imageSize,
        maxSize: this.MAX_IMAGE_SIZE,
      },
      'Validating image size'
    );

    if (imageSize > this.MAX_IMAGE_SIZE) {
      logger.warn(
        {
          userId,
          messageId,
          imageSize,
          maxSize: this.MAX_IMAGE_SIZE,
        },
        'Image exceeds maximum allowed size'
      );

      throw new Error('IMAGE_TOO_LARGE');
    }

    logger.debug({ userId, messageId, imageSize }, 'Image size validation passed');
  }

  /**
   * Extract and verify payment slip from image
   * Extracts QR code, verifies with SlipOK, and validates all required fields
   * @param imageBuffer - The image data buffer
   * @param userId - The LINE user ID for logging
   * @param messageId - The message ID for logging
   * @returns SlipOKVerificationResult with verified payment data
   * @throws Error if QR code not found, verification fails, or data incomplete
   */
  private async extractAndVerifySlip(
    imageBuffer: Buffer,
    userId: string,
    messageId: string
  ): Promise<SlipOKVerificationResult> {
    logger.info(
      {
        event: 'qr_extraction_started',
        userId,
        messageId,
        imageSize: imageBuffer.length,
      },
      'Starting QR code extraction from image'
    );

    // Step 1: Extract QR code from image
    let qrCodeData: string | null = null;
    
    try {
      qrCodeData = await readQRCode(imageBuffer);
    } catch (error) {
      logger.error(
        {
          event: 'qr_extraction_error',
          userId,
          messageId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Error extracting QR code from image'
      );
      throw new Error('NO_QR_CODE');
    }

    if (!qrCodeData) {
      logger.info(
        {
          event: 'qr_code_not_found',
          userId,
          messageId,
        },
        'No QR code found in image'
      );
      throw new Error('NO_QR_CODE');
    }

    logger.info(
      {
        event: 'qr_code_extracted',
        userId,
        messageId,
        qrDataLength: qrCodeData.length,
      },
      'QR code extracted successfully'
    );

    // Step 2: Verify slip with SlipOK
    try {
      logger.info(
        {
          event: 'slipok_verification_started',
          userId,
          messageId,
        },
        'Starting SlipOK verification'
      );

      const verificationResult = await SlipOKService.verifySlip({
        data: qrCodeData,
        log: true,
      });

      logger.info(
        {
          event: 'slipok_verification_response',
          userId,
          messageId,
          success: verificationResult.success,
        },
        'SlipOK verification response received'
      );

      // Step 3: Validate verification result
      if (!verificationResult.success || !verificationResult.data || !verificationResult.data.success) {
        logger.warn(
          {
            event: 'slipok_verification_failed',
            userId,
            messageId,
            message: verificationResult.message,
          },
          'SlipOK verification failed'
        );
        throw new Error('SLIPOK_VERIFICATION_FAILED');
      }

      const slipData = verificationResult.data;

      // Step 4: Extract and validate all required fields
      const requiredFields = [
        'transRef',
        'amount',
        'transDate',
        'transTime',
        'sendingBank',
        'receivingBank',
        'sender',
        'receiver',
      ];

      const missingFields = requiredFields.filter(field => !slipData[field]);

      if (missingFields.length > 0) {
        logger.error(
          {
            event: 'slipok_data_incomplete',
            userId,
            messageId,
            missingFields,
          },
          'SlipOK response missing required fields'
        );
        throw new Error('SLIPOK_DATA_INCOMPLETE');
      }

      // Validate nested sender fields
      if (!slipData.sender.displayName || !slipData.sender.name || !slipData.sender.account) {
        logger.error(
          {
            event: 'slipok_sender_incomplete',
            userId,
            messageId,
          },
          'SlipOK sender information incomplete'
        );
        throw new Error('SLIPOK_DATA_INCOMPLETE');
      }

      // Validate nested receiver fields
      if (!slipData.receiver.displayName || !slipData.receiver.name || !slipData.receiver.account) {
        logger.error(
          {
            event: 'slipok_receiver_incomplete',
            userId,
            messageId,
          },
          'SlipOK receiver information incomplete'
        );
        throw new Error('SLIPOK_DATA_INCOMPLETE');
      }

      logger.info(
        {
          event: 'slipok_verification_success',
          userId,
          messageId,
          transRef: slipData.transRef,
          amount: slipData.amount,
        },
        'SlipOK verification successful with complete data'
      );

      // Return validated result
      return {
        transRef: slipData.transRef,
        amount: slipData.amount,
        transDate: slipData.transDate,
        transTime: slipData.transTime,
        sendingBank: slipData.sendingBank,
        receivingBank: slipData.receivingBank,
        sender: {
          displayName: slipData.sender.displayName,
          name: slipData.sender.name,
          account: slipData.sender.account,
        },
        receiver: {
          displayName: slipData.receiver.displayName,
          name: slipData.receiver.name,
          account: slipData.receiver.account,
        },
      };
    } catch (error) {
      // Check if it's one of our specific errors
      if (error instanceof Error && 
          (error.message === 'SLIPOK_VERIFICATION_FAILED' || 
           error.message === 'SLIPOK_DATA_INCOMPLETE' ||
           error.message === 'NO_QR_CODE')) {
        throw error;
      }

      // Handle SlipOK service unavailable or network errors
      logger.error(
        {
          event: 'slipok_verification_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
          userId,
          messageId,
        },
        'SlipOK verification threw an error'
      );
      throw new Error('SLIPOK_SERVICE_UNAVAILABLE');
    }
  }

  /**
   * Match payment to loan contract
   * Uses PaymentMatchingService to find the associated loan
   * @param slipokData - Verified payment data from SlipOK
   * @param lineUserId - The LINE user ID of the sender
   * @returns Matched loan or null if no match found
   */
  private async matchPaymentToLoan(
    slipokData: SlipOKVerificationResult,
    lineUserId: string
  ): Promise<typeof loans.$inferSelect | null> {
    logger.info(
      {
        event: 'payment_matching_started',
        transRef: slipokData.transRef,
        amount: slipokData.amount,
        lineUserId,
      },
      'Starting payment matching to loan contract'
    );

    try {
      // Call PaymentMatchingService with SlipOK data and LINE user ID
      const loan = await this.matchingService.findLoanForPayment(
        {
          transRef: slipokData.transRef,
          sendingBank: slipokData.sendingBank,
          receivingBank: slipokData.receivingBank,
          transDate: slipokData.transDate,
          transTime: slipokData.transTime,
          amount: slipokData.amount,
          sender: {
            displayName: slipokData.sender.displayName,
            name: slipokData.sender.name,
            account: {
              value: slipokData.sender.account,
            },
          },
          receiver: {
            displayName: slipokData.receiver.displayName,
            name: slipokData.receiver.name,
            account: {
              value: slipokData.receiver.account,
            },
          },
          success: true,
        },
        lineUserId
      );

      logger.info(
        {
          event: 'payment_matched',
          transRef: slipokData.transRef,
          loanId: loan.id,
          contractNumber: loan.contract_number,
          lineUserId,
        },
        'Payment successfully matched to loan contract'
      );

      return loan;
    } catch (error) {
      // Handle PaymentMatchingError when no loan can be matched
      if (error instanceof PaymentMatchingError) {
        logger.warn(
          {
            event: 'payment_matching_failed',
            transRef: slipokData.transRef,
            amount: slipokData.amount,
            lineUserId,
            error: error.message,
          },
          'Payment matching failed - no matching loan found'
        );
        return null;
      }

      // Re-throw unexpected errors
      logger.error(
        {
          event: 'payment_matching_error',
          transRef: slipokData.transRef,
          lineUserId,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Unexpected error during payment matching'
      );
      throw error;
    }
  }

  /**
   * Handle unmatched payment
   * Stores payment in pending_payments table for manual review
   * @param slipokData - Verified payment data from SlipOK
   * @param replyToken - Reply token for sending message
   * @param userId - The LINE user ID
   */
  private async handleUnmatchedPayment(
    slipokData: SlipOKVerificationResult,
    replyToken: string,
    userId: string
  ): Promise<void> {
    logger.info(
      {
        event: 'unmatched_payment_handling_started',
        transRef: slipokData.transRef,
        amount: slipokData.amount,
        userId,
      },
      'Handling unmatched payment'
    );

    try {
      // Parse SlipOK date/time into Date object
      // Format: transDate = "DD/MM/YYYY", transTime = "HH:MM:SS"
      const dateTimeString = `${slipokData.transDate} ${slipokData.transTime}`;
      const paymentDate = dayjs(dateTimeString, 'DD/MM/YYYY HH:mm:ss').toDate();

      logger.debug(
        {
          transRef: slipokData.transRef,
          transDate: slipokData.transDate,
          transTime: slipokData.transTime,
          parsedDate: paymentDate.toISOString(),
        },
        'Parsed payment date/time'
      );

      // Create pending payment record
      const pendingPayment = await this.pendingPaymentsRepository.create({
        transaction_ref_id: slipokData.transRef,
        amount: slipokData.amount.toString(),
        payment_date: paymentDate,
        sender_info: {
          displayName: slipokData.sender.displayName,
          name: slipokData.sender.name,
          account: slipokData.sender.account,
        },
        receiver_info: {
          displayName: slipokData.receiver.displayName,
          name: slipokData.receiver.name,
          account: slipokData.receiver.account,
        },
        bank_info: {
          sendingBank: slipokData.sendingBank,
          receivingBank: slipokData.receivingBank,
        },
        status: 'Unmatched',
      });

      logger.info(
        {
          event: 'pending_payment_created',
          pendingPaymentId: pendingPayment.id,
          transRef: slipokData.transRef,
          amount: slipokData.amount,
          paymentDate: paymentDate.toISOString(),
          userId,
        },
        'Pending payment record created successfully'
      );

      // Send user message
      await this.replyUtil.replyText(
        replyToken,
        'ได้รับข้อมูลการชำระเงินของคุณแล้ว กำลังตรวจสอบ เจ้าหน้าที่จะติดต่อกลับภายใน 24 ชั่วโมง',
        userId
      );

      logger.info(
        {
          event: 'unmatched_payment_notification_sent',
          transRef: slipokData.transRef,
          userId,
        },
        'Unmatched payment notification sent to user'
      );
    } catch (error) {
      logger.error(
        {
          event: 'unmatched_payment_handling_error',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          transRef: slipokData.transRef,
          userId,
        },
        'Error handling unmatched payment'
      );
      throw error;
    }
  }

  /**
   * Process payment through Payment Domain
   * Parses SlipOK date/time, builds ProcessPaymentRequest, and calls PaymentDomain
   * @param slipokData - Verified payment data from SlipOK
   * @param loan - Matched loan contract
   * @returns PaymentResult with transaction details
   * @throws DuplicateTransactionError if payment already processed
   * @throws Error for other payment processing failures
   */
  private async processPayment(
    slipokData: SlipOKVerificationResult,
    loan: typeof loans.$inferSelect
  ): Promise<PaymentResult> {
    logger.info(
      {
        event: 'payment_processing_started',
        transRef: slipokData.transRef,
        loanId: loan.id,
        amount: slipokData.amount,
      },
      'Starting payment processing'
    );

    try {
      // Parse SlipOK date/time strings into Date object
      // Format: transDate = "DD/MM/YYYY", transTime = "HH:MM:SS"
      const dateTimeString = `${slipokData.transDate} ${slipokData.transTime}`;
      const paymentDate = dayjs(dateTimeString, 'DD/MM/YYYY HH:mm:ss').toDate();

      logger.debug(
        {
          transRef: slipokData.transRef,
          transDate: slipokData.transDate,
          transTime: slipokData.transTime,
          parsedDate: paymentDate.toISOString(),
        },
        'Parsed payment date/time for processing'
      );

      // Build ProcessPaymentRequest with all required fields
      const paymentRequest: ProcessPaymentRequest = {
        transactionRefId: slipokData.transRef,
        loanId: loan.id,
        amount: slipokData.amount,
        paymentDate: paymentDate,
        paymentMethod: 'Bank Transfer',
        paymentSource: 'LINE Slip Upload',
        notes: `Payment via LINE slip upload. Sender: ${slipokData.sender.displayName} (${slipokData.sender.account})`,
      };

      logger.info(
        {
          event: 'payment_domain_invocation',
          transRef: slipokData.transRef,
          loanId: loan.id,
          amount: slipokData.amount,
          paymentDate: paymentDate.toISOString(),
        },
        'Invoking PaymentDomain.processPayment'
      );

      // Call PaymentDomain.processPayment() with request
      const result = await this.paymentDomain.processPayment(paymentRequest);

      logger.info(
        {
          event: 'payment_processed',
          transRef: slipokData.transRef,
          loanId: loan.id,
          transactionId: result.transactionId,
          allocation: result.allocation,
          balanceAfter: result.balanceAfter,
          newStatus: result.newStatus,
        },
        'Payment processed successfully'
      );

      return result;
    } catch (error) {
      // Handle DuplicateTransactionError specifically
      if (error instanceof DuplicateTransactionError) {
        logger.warn(
          {
            event: 'duplicate_transaction_detected',
            transRef: slipokData.transRef,
            loanId: loan.id,
            error: error.message,
          },
          'Duplicate transaction detected during payment processing'
        );
        throw error;
      }

      // Handle PaymentValidationError
      if (error instanceof PaymentValidationError) {
        logger.error(
          {
            event: 'payment_validation_failed',
            transRef: slipokData.transRef,
            loanId: loan.id,
            error: error.message,
            details: error.details,
          },
          'Payment validation failed'
        );
        throw error;
      }

      // Handle LoanNotFoundError
      if (error instanceof LoanNotFoundError) {
        logger.error(
          {
            event: 'loan_not_found',
            transRef: slipokData.transRef,
            loanId: loan.id,
            error: error.message,
          },
          'Loan not found during payment processing'
        );
        throw error;
      }

      // Handle InvalidLoanStatusError
      if (error instanceof InvalidLoanStatusError) {
        logger.error(
          {
            event: 'invalid_loan_status',
            transRef: slipokData.transRef,
            loanId: loan.id,
            error: error.message,
          },
          'Invalid loan status for payment processing'
        );
        throw error;
      }

      // Handle PaymentProcessingError
      if (error instanceof PaymentProcessingError) {
        logger.error(
          {
            event: 'payment_processing_error',
            transRef: slipokData.transRef,
            loanId: loan.id,
            error: error.message,
            cause: error.cause?.message,
          },
          'Payment processing error occurred'
        );
        throw error;
      }

      // Log and re-throw other unexpected errors
      logger.error(
        {
          event: 'payment_processing_failed',
          transRef: slipokData.transRef,
          loanId: loan.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Unexpected error during payment processing'
      );

      throw error;
    }
  }

  /**
   * Send payment confirmation to user
   * Formats and sends confirmation message with payment details
   * @param replyToken - Reply token for sending message
   * @param userId - The LINE user ID
   * @param result - Payment processing result
   * @param slipokData - Verified payment data from SlipOK
   * @param loan - The loan contract that was paid
   */
  private async sendPaymentConfirmation(
    replyToken: string,
    userId: string,
    result: PaymentResult,
    slipokData: SlipOKVerificationResult,
    loan: typeof loans.$inferSelect
  ): Promise<void> {
    logger.info(
      {
        event: 'payment_confirmation_started',
        transactionId: result.transactionId,
        userId,
        loanId: loan.id,
      },
      'Sending payment confirmation to user'
    );

    try {
      // Format confirmation message with all required details
      const confirmationMessage = 
        `✅ ชำระเงินสำเร็จ\n\n` +
        `💰 จำนวนเงิน: ${slipokData.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท\n\n` +
        `📊 การจัดสรรเงิน:\n` +
        `   • ค่าปรับ: ${result.allocation.toPenalties.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท\n` +
        `   • ดอกเบี้ย: ${result.allocation.toInterest.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท\n` +
        `   • เงินต้น: ${result.allocation.toPrincipal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท\n\n` +
        `💳 ยอดคงเหลือ: ${result.balanceAfter.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท\n` +
        `📝 รหัสอ้างอิง: ${slipokData.transRef}\n` +
        `🔖 รหัสธุรกรรม: ${result.transactionId}`;

      // Send confirmation message
      await this.replyUtil.replyText(
        replyToken,
        confirmationMessage,
        userId
      );

      logger.info(
        {
          event: 'payment_confirmation_sent',
          transactionId: result.transactionId,
          userId,
          loanId: loan.id,
        },
        'Payment confirmation sent successfully'
      );

      // Check if loan is closed (status is "Closed" and balance is zero)
      if (result.newStatus === 'Closed' && result.balanceAfter === 0) {
        logger.info(
          {
            event: 'loan_closed_detected',
            transactionId: result.transactionId,
            userId,
            loanId: loan.id,
            contractNumber: loan.contract_number,
          },
          'Loan closed - sending congratulatory message'
        );

        // Send congratulatory message for loan closure
        const congratsMessage = 
          `🎉 ยินดีด้วย! 🎉\n\n` +
          `คุณได้ชำระเงินครบถ้วนแล้ว\n` +
          `สัญญาเลขที่ ${loan.contract_number} ได้ปิดเรียบร้อยแล้ว\n\n` +
          `ขอบคุณที่ไว้วางใจในบริการของเรา`;

        // Send congratulatory message (use a separate LINE API call, not reply)
        // Note: We can't use replyToken twice, so we need to use push message
        try {
          await this.client.pushMessage(userId, [
            {
              type: 'text',
              text: congratsMessage,
            },
          ]);

          logger.info(
            {
              event: 'loan_closed_notification_sent',
              transactionId: result.transactionId,
              userId,
              loanId: loan.id,
            },
            'Loan closed congratulatory message sent'
          );
        } catch (pushError) {
          // Log but don't throw - notification failure shouldn't fail the payment
          logger.error(
            {
              event: 'loan_closed_notification_failed',
              error: pushError instanceof Error ? pushError.message : 'Unknown error',
              transactionId: result.transactionId,
              userId,
              loanId: loan.id,
            },
            'Failed to send loan closed notification, but payment was successful'
          );
        }
      }
    } catch (error) {
      // Handle notification failures gracefully - log but don't throw
      // This ensures notification failures don't fail payment transactions
      logger.error(
        {
          event: 'payment_confirmation_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof Error ? error.name : typeof error,
          stack: error instanceof Error ? error.stack : undefined,
          transactionId: result.transactionId,
          userId,
          loanId: loan.id,
        },
        'Failed to send payment confirmation, but payment was processed successfully'
      );

      // Don't throw - notification failure shouldn't fail the payment transaction
      // The payment has already been processed successfully
      // Requirements 6.5: Notification failures don't fail payment transactions
    }
  }

  /**
   * Processes the downloaded image according to business requirements
   * Orchestrates the complete payment slip processing workflow
   * @param imageBuffer - The image data buffer
   * @param messageId - The message ID
   * @param userId - The LINE user ID
   * @param replyToken - Reply token for sending messages
   */
  private async processImage(
    imageBuffer: Buffer,
    messageId: string,
    userId: string,
    replyToken: string
  ): Promise<void> {
    logger.info(
      {
        event: 'payment_slip_processing_started',
        userId,
        messageId,
        imageSize: imageBuffer.length,
      },
      'Starting payment slip processing workflow'
    );

    // Step 1: Extract and verify slip
    const slipokData = await this.extractAndVerifySlip(imageBuffer, userId, messageId);

    logger.info(
      {
        event: 'slip_verified_proceeding_to_matching',
        userId,
        messageId,
        transRef: slipokData.transRef,
        amount: slipokData.amount,
      },
      'Slip verified successfully, proceeding to payment matching'
    );

    // Step 2: Match payment to loan
    const loan = await this.matchPaymentToLoan(slipokData, userId);

    // Step 3: Handle unmatched payment
    if (!loan) {
      logger.info(
        {
          event: 'payment_unmatched_storing_pending',
          userId,
          messageId,
          transRef: slipokData.transRef,
        },
        'Payment could not be matched, storing as pending'
      );
      await this.handleUnmatchedPayment(slipokData, replyToken, userId);
      return;
    }

    logger.info(
      {
        event: 'loan_matched_proceeding_to_processing',
        userId,
        messageId,
        transRef: slipokData.transRef,
        loanId: loan.id,
        contractNumber: loan.contract_number,
      },
      'Loan matched successfully, proceeding to payment processing'
    );

    // Step 4: Process payment
    const result = await this.processPayment(slipokData, loan);

    logger.info(
      {
        event: 'payment_processed_sending_confirmation',
        userId,
        messageId,
        transRef: slipokData.transRef,
        transactionId: result.transactionId,
      },
      'Payment processed successfully, sending confirmation to user'
    );

    // Step 5: Send payment confirmation
    await this.sendPaymentConfirmation(replyToken, userId, result, slipokData, loan);

    logger.info(
      {
        event: 'payment_slip_processing_completed',
        userId,
        messageId,
        transRef: slipokData.transRef,
        transactionId: result.transactionId,
        loanId: loan.id,
      },
      'Payment slip processing workflow completed successfully'
    );
  }

  /**
   * Send error message to user
   * Maps error types to user-friendly Thai messages and handles all error scenarios
   * Ensures all errors are logged with required context
   * @param replyToken - Reply token for sending message
   * @param userId - The LINE user ID
   * @param messageId - The message ID for logging
   * @param error - The error that occurred
   */
  private async sendErrorMessage(
    replyToken: string,
    userId: string,
    messageId: string,
    error: unknown
  ): Promise<void> {
    try {
      let userMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
      let errorDetails: Record<string, any> = {
        userId,
        messageId,
      };

      // Map error types to user-friendly messages
      if (error instanceof DuplicateTransactionError) {
        userMessage = ERROR_MESSAGES.DUPLICATE_TRANSACTION;
        errorDetails = {
          ...errorDetails,
          errorType: 'DuplicateTransactionError',
          errorMessage: error.message,
        };
      } else if (error instanceof PaymentValidationError) {
        userMessage = ERROR_MESSAGES.PAYMENT_VALIDATION_ERROR;
        errorDetails = {
          ...errorDetails,
          errorType: 'PaymentValidationError',
          errorMessage: error.message,
          validationDetails: error.details,
        };
      } else if (error instanceof LoanNotFoundError) {
        userMessage = ERROR_MESSAGES.LOAN_NOT_FOUND;
        errorDetails = {
          ...errorDetails,
          errorType: 'LoanNotFoundError',
          errorMessage: error.message,
        };
      } else if (error instanceof InvalidLoanStatusError) {
        // Check if loan is closed
        if (error.message.includes('Closed')) {
          userMessage = ERROR_MESSAGES.LOAN_CLOSED;
        } else {
          userMessage = ERROR_MESSAGES.INVALID_LOAN_STATUS;
        }
        errorDetails = {
          ...errorDetails,
          errorType: 'InvalidLoanStatusError',
          errorMessage: error.message,
        };
      } else if (error instanceof PaymentMatchingError) {
        userMessage = ERROR_MESSAGES.PAYMENT_NOT_MATCHED;
        errorDetails = {
          ...errorDetails,
          errorType: 'PaymentMatchingError',
          errorMessage: error.message,
          slipokData: error.slipokData,
        };
      } else if (error instanceof PaymentProcessingError) {
        userMessage = ERROR_MESSAGES.PAYMENT_PROCESSING_FAILED;
        errorDetails = {
          ...errorDetails,
          errorType: 'PaymentProcessingError',
          errorMessage: error.message,
          cause: error.cause?.message,
        };
      } else if (error instanceof Error) {
        // Handle generic errors with specific messages
        const errorMessage = error.message;

        if (errorMessage.includes('IMAGE_TOO_LARGE') || errorMessage.includes('exceeds maximum size')) {
          userMessage = ERROR_MESSAGES.IMAGE_TOO_LARGE;
        } else if (errorMessage.includes('DOWNLOAD_ERROR') || errorMessage.includes('download')) {
          userMessage = ERROR_MESSAGES.DOWNLOAD_ERROR;
        } else if (errorMessage.includes('NO_QR_CODE') || errorMessage.includes('QR code')) {
          userMessage = ERROR_MESSAGES.NO_QR_CODE;
        } else if (errorMessage.includes('SLIPOK_SERVICE_UNAVAILABLE') || errorMessage.includes('service unavailable')) {
          userMessage = ERROR_MESSAGES.SLIPOK_SERVICE_UNAVAILABLE;
        } else if (errorMessage.includes('SLIPOK_VERIFICATION_FAILED') || errorMessage.includes('verification failed')) {
          userMessage = ERROR_MESSAGES.SLIPOK_VERIFICATION_FAILED;
        } else if (errorMessage.includes('SLIPOK_DATA_INCOMPLETE') || errorMessage.includes('incomplete data')) {
          userMessage = ERROR_MESSAGES.SLIPOK_DATA_INCOMPLETE;
        } else if (errorMessage.includes('PROCESSING_ERROR') || errorMessage.includes('processing')) {
          userMessage = ERROR_MESSAGES.PROCESSING_ERROR;
        } else {
          userMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
        }

        errorDetails = {
          ...errorDetails,
          errorType: error.name || 'Error',
          errorMessage: error.message,
          stack: error.stack,
        };
      } else {
        // Non-Error objects
        errorDetails = {
          ...errorDetails,
          errorType: 'Unknown',
          errorValue: String(error),
        };
      }

      // Log error with all required context
      logger.error(
        {
          event: 'error_message_sent',
          ...errorDetails,
        },
        'Error occurred during payment slip processing'
      );

      // Send user-friendly error message
      await this.replyUtil.replyText(replyToken, userMessage, userId);

      logger.info(
        {
          event: 'error_notification_sent',
          userId,
          messageId,
          userMessage,
        },
        'Error message sent to user'
      );
    } catch (notificationError) {
      // If sending error message fails, log it but don't throw
      // This ensures notification failures don't fail the overall error handling
      logger.error(
        {
          event: 'error_notification_failed',
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error',
          stack: notificationError instanceof Error ? notificationError.stack : undefined,
          userId,
          messageId,
          originalError: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to send error notification to user'
      );
    }
  }
}
