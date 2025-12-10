import { logger } from '../../../core/logger';
import type { EventHandler } from '../line.router';
import type { LineEvent, LinePostbackEvent, EventContext } from '../line.types';
import type { LineReplyUtil } from '../utils/line-reply.util';
import type { LineDomain } from '../line.domain';

/**
 * Fallback error messages for postback handling
 */
const FALLBACK_MESSAGES = {
  INVALID_ACTION: 'คำสั่งไม่ถูกต้อง กรุณาเลือกใหม่',
  PROCESSING_ERROR: 'ไม่สามารถดำเนินการได้ กรุณาลองใหม่',
  PARSE_ERROR: 'ข้อมูลไม่ถูกต้อง กรุณาลองใหม่',
};

/**
 * Postback Handler
 * Processes postback events from interactive buttons in flex messages
 * Parses postback data and executes corresponding business logic
 * Implements EventHandler interface for strategy pattern
 */
export class PostbackHandler implements EventHandler {
  constructor(
    private readonly replyUtil: LineReplyUtil,
    private readonly lineDomain: LineDomain
  ) { }

  /**
   * Determines if this handler can process the given event
   * @param event - The LINE event to check
   * @returns true if event is a postback event
   */
  canHandle(event: LineEvent): boolean {
    return event.type === 'postback';
  }

  /**
   * Processes postback events
   * Extracts and parses postback data, executes business logic, and sends confirmation
   * @param event - The LINE postback event
   * @param context - Event context with reply token and user info
   */
  async handle(event: LineEvent, context: EventContext): Promise<void> {
    // Type guard to ensure we have a postback event
    if (!this.canHandle(event)) {
      throw new Error('PostbackHandler cannot handle this event type');
    }

    const postbackEvent = event as LinePostbackEvent;
    const postbackDataString = postbackEvent.postback.data;
    const postbackParams = postbackEvent.postback.params;
    const userId = context.userId;
    const replyToken = context.replyToken;

    logger.info(
      {
        userId,
        postbackData: postbackDataString,
        hasParams: !!postbackParams,
      },
      'Processing postback event from LINE user'
    );

    try {
      // Delegate to LineDomain logic
      await this.lineDomain.handlePostback(event as LinePostbackEvent, replyToken);

      logger.info(
        {
          userId,
          action: 'delegated_to_domain',
        },
        'Postback processed successfully via LineDomain'
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          postbackData: postbackDataString,
        },
        'Error processing postback event'
      );

      // Send appropriate fallback error message
      await this.sendFallbackMessage(replyToken, userId, error);
    }
  }

  /**
   * Sends appropriate fallback error message based on error type
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

      // Determine appropriate fallback message based on error type
      let fallbackText = FALLBACK_MESSAGES.PROCESSING_ERROR;

      if (errorMessage.includes('INVALID_ACTION') || errorMessage.includes('Unknown')) {
        fallbackText = FALLBACK_MESSAGES.INVALID_ACTION;
      } else if (errorMessage.includes('PARSE_ERROR') || errorMessage.includes('parse')) {
        fallbackText = FALLBACK_MESSAGES.PARSE_ERROR;
      }

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
