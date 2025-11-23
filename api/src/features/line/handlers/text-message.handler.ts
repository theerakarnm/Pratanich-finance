import { logger } from '../../../core/logger';
import type { EventHandler } from '../line.router';
import type { LineEvent, LineMessageEvent, EventContext } from '../line.types';
import type { LineReplyUtil } from '../utils/line-reply.util';

/**
 * Fallback error messages for text message handling
 */
const FALLBACK_MESSAGES = {
  GENERAL_ERROR: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
  PROCESSING_ERROR: 'ไม่สามารถประมวลผลข้อความได้ กรุณาลองใหม่',
};

/**
 * Text Message Handler
 * Processes text message events from LINE users
 * Implements EventHandler interface for strategy pattern
 */
export class TextMessageHandler implements EventHandler {
  constructor(private readonly replyUtil: LineReplyUtil) {}

  /**
   * Determines if this handler can process the given event
   * @param event - The LINE event to check
   * @returns true if event is a text message event
   */
  canHandle(event: LineEvent): boolean {
    return (
      event.type === 'message' &&
      'message' in event &&
      event.message.type === 'text'
    );
  }

  /**
   * Processes text message events
   * Extracts message text and user ID, routes to business logic, and sends response
   * @param event - The LINE message event
   * @param context - Event context with reply token and user info
   */
  async handle(event: LineEvent, context: EventContext): Promise<void> {
    // Type guard to ensure we have a message event
    if (!this.canHandle(event)) {
      throw new Error('TextMessageHandler cannot handle this event type');
    }

    const messageEvent = event as LineMessageEvent;
    const textMessage = messageEvent.message;

    // Type guard for text message
    if (textMessage.type !== 'text') {
      throw new Error('Expected text message but got different type');
    }

    const messageText = textMessage.text;
    const messageId = textMessage.id;
    const userId = context.userId;
    const replyToken = context.replyToken;

    logger.info(
      {
        userId,
        messageId,
        messageText: messageText.substring(0, 100), // Log first 100 chars
        textLength: messageText.length,
      },
      'Processing text message from LINE user'
    );

    try {
      // Route to business logic based on message content
      const response = await this.routeTextMessage(messageText, userId);

      // Send response to user
      await this.replyUtil.replyText(replyToken, response, userId);

      logger.info(
        { userId, messageId, responseLength: response.length },
        'Text message processed and response sent successfully'
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          messageId,
          messageText: messageText.substring(0, 100),
        },
        'Error processing text message'
      );

      // Send fallback error message to user
      await this.sendFallbackMessage(replyToken, userId, error);
    }
  }

  /**
   * Routes text message to appropriate business logic handler
   * @param messageText - The text content of the message
   * @param userId - The LINE user ID
   * @returns Response message to send back to user
   */
  private async routeTextMessage(
    messageText: string,
    userId: string
  ): Promise<string> {
    const normalizedText = messageText.trim().toLowerCase();

    logger.debug(
      { userId, normalizedText: normalizedText.substring(0, 50) },
      'Routing text message to business logic'
    );

    // TODO: Implement actual business logic routing
    // This is a placeholder implementation that will be replaced with actual business logic
    
    // Example routing patterns:
    if (normalizedText.includes('สวัสดี') || normalizedText.includes('hello')) {
      return 'สวัสดีครับ! ยินดีให้บริการ\nคุณสามารถถามข้อมูลเกี่ยวกับสัญญากู้ของคุณได้';
    }

    if (normalizedText.includes('ยอดค้าง') || normalizedText.includes('balance')) {
      return 'กรุณารอสักครู่ กำลังตรวจสอบยอดค้างชำระของคุณ...';
    }

    if (normalizedText.includes('ชำระ') || normalizedText.includes('payment')) {
      return 'กรุณาเลือกวิธีการชำระเงินจากเมนูด้านล่าง';
    }

    if (normalizedText.includes('ติดต่อ') || normalizedText.includes('contact')) {
      return 'ติดต่อเจ้าหน้าที่:\nโทร: 02-XXX-XXXX\nเวลาทำการ: จันทร์-ศุกร์ 9:00-17:00';
    }

    // Default response for unrecognized messages
    return 'ขอบคุณสำหรับข้อความของคุณ\nหากต้องการความช่วยเหลือ กรุณาติดต่อเจ้าหน้าที่';
  }

  /**
   * Sends fallback error message to user when processing fails
   * @param replyToken - Reply token for sending message
   * @param userId - The LINE user ID
   * @param error - The error that occurred
   */
  private async sendFallbackMessage(
    replyToken: string,
    userId: string,
    error: unknown
  ): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Determine appropriate fallback message
      const fallbackText = errorMessage.includes('business logic')
        ? FALLBACK_MESSAGES.PROCESSING_ERROR
        : FALLBACK_MESSAGES.GENERAL_ERROR;

      await this.replyUtil.replyText(replyToken, fallbackText, userId);

      logger.info(
        { userId, fallbackMessage: fallbackText },
        'Fallback error message sent to user'
      );
    } catch (fallbackError) {
      // If even the fallback fails, just log it
      logger.error(
        {
          error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
          userId,
          originalError: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to send fallback error message'
      );
    }
  }
}
