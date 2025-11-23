import { logger } from '../../../core/logger';
import type { EventHandler } from '../line.router';
import type { LineEvent, LinePostbackEvent, EventContext, PostbackData } from '../line.types';
import type { LineReplyUtil } from '../utils/line-reply.util';

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
  constructor(private readonly replyUtil: LineReplyUtil) {}

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
      // Parse postback data
      const postbackData = this.parsePostbackData(postbackDataString, userId);

      logger.debug(
        {
          userId,
          action: postbackData.action,
          params: postbackData.params,
        },
        'Postback data parsed successfully'
      );

      // Execute business logic based on action
      const response = await this.executePostbackAction(
        postbackData,
        userId,
        postbackParams
      );

      // Send confirmation message
      await this.replyUtil.replyText(replyToken, response, userId);

      logger.info(
        {
          userId,
          action: postbackData.action,
          responseLength: response.length,
        },
        'Postback processed and confirmation sent successfully'
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
   * Parses postback data from JSON string format
   * @param dataString - The postback data string (JSON format)
   * @param userId - The LINE user ID for logging
   * @returns Parsed PostbackData object
   * @throws Error if parsing fails or data is invalid
   */
  private parsePostbackData(dataString: string, userId: string): PostbackData {
    try {
      logger.debug(
        { userId, dataString: dataString.substring(0, 200) },
        'Parsing postback data'
      );

      // Parse JSON string
      const parsed = JSON.parse(dataString);

      // Validate required fields
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Postback data must be an object');
      }

      if (!parsed.action || typeof parsed.action !== 'string') {
        throw new Error('Postback data must contain an action field');
      }

      const postbackData: PostbackData = {
        action: parsed.action,
        params: parsed.params || {},
      };

      logger.debug(
        {
          userId,
          action: postbackData.action,
          paramsCount: Object.keys(postbackData.params || {}).length,
        },
        'Postback data parsed and validated'
      );

      return postbackData;
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          dataString: dataString.substring(0, 200),
        },
        'Failed to parse postback data'
      );

      throw new Error('PARSE_ERROR');
    }
  }

  /**
   * Executes business logic based on postback action
   * @param postbackData - The parsed postback data
   * @param userId - The LINE user ID
   * @param postbackParams - Additional params from LINE (e.g., datetime picker)
   * @returns Confirmation message to send to user
   */
  private async executePostbackAction(
    postbackData: PostbackData,
    userId: string,
    postbackParams?: Record<string, any>
  ): Promise<string> {
    const { action, params } = postbackData;

    logger.info(
      {
        userId,
        action,
        params,
        postbackParams,
      },
      'Executing postback action'
    );

    try {
      // TODO: Implement actual business logic for each action
      // This is a placeholder implementation that will be replaced with actual business logic

      // Route to appropriate business logic based on action type
      switch (action) {
        case 'view_loan_details':
          return await this.handleViewLoanDetails(params || {}, userId);

        case 'make_payment':
          return await this.handleMakePayment(params || {}, userId);

        case 'view_payment_history':
          return await this.handleViewPaymentHistory(params || {}, userId);

        case 'contact_support':
          return await this.handleContactSupport(params || {}, userId);

        case 'schedule_payment':
          return await this.handleSchedulePayment(params || {}, userId, postbackParams);

        default:
          logger.warn(
            { userId, action },
            'Unknown postback action received'
          );
          throw new Error('INVALID_ACTION');
      }
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          action,
        },
        'Error executing postback action'
      );

      throw new Error('PROCESSING_ERROR');
    }
  }

  /**
   * Handles view loan details action
   */
  private async handleViewLoanDetails(
    params: Record<string, any>,
    userId: string
  ): Promise<string> {
    const loanId = params.loanId;

    logger.debug({ userId, loanId }, 'Handling view loan details action');

    // TODO: Fetch actual loan details from database
    return `กำลังแสดงรายละเอียดสัญญากู้\nเลขที่สัญญา: ${loanId || 'N/A'}\n\nกรุณารอสักครู่...`;
  }

  /**
   * Handles make payment action
   */
  private async handleMakePayment(
    params: Record<string, any>,
    userId: string
  ): Promise<string> {
    const loanId = params.loanId;
    const amount = params.amount;

    logger.debug({ userId, loanId, amount }, 'Handling make payment action');

    // TODO: Implement payment processing logic
    return `กำลังดำเนินการชำระเงิน\nเลขที่สัญญา: ${loanId || 'N/A'}\nจำนวนเงิน: ${amount || 'N/A'} บาท\n\nกรุณาทำตามขั้นตอนต่อไป`;
  }

  /**
   * Handles view payment history action
   */
  private async handleViewPaymentHistory(
    params: Record<string, any>,
    userId: string
  ): Promise<string> {
    const loanId = params.loanId;

    logger.debug({ userId, loanId }, 'Handling view payment history action');

    // TODO: Fetch actual payment history from database
    return `ประวัติการชำระเงิน\nเลขที่สัญญา: ${loanId || 'N/A'}\n\nกำลังโหลดข้อมูล...`;
  }

  /**
   * Handles contact support action
   */
  private async handleContactSupport(
    params: Record<string, any>,
    userId: string
  ): Promise<string> {
    const topic = params.topic;

    logger.debug({ userId, topic }, 'Handling contact support action');

    // TODO: Create support ticket or route to support system
    return `ติดต่อฝ่ายสนับสนุน\nหัวข้อ: ${topic || 'ทั่วไป'}\n\nเจ้าหน้าที่จะติดต่อกลับโดยเร็ว\nโทร: 02-XXX-XXXX`;
  }

  /**
   * Handles schedule payment action
   */
  private async handleSchedulePayment(
    params: Record<string, any>,
    userId: string,
    postbackParams?: Record<string, any>
  ): Promise<string> {
    const loanId = params.loanId;
    const scheduledDate = postbackParams?.date || params.date;

    logger.debug(
      { userId, loanId, scheduledDate },
      'Handling schedule payment action'
    );

    // TODO: Implement payment scheduling logic
    return `นัดหมายการชำระเงิน\nเลขที่สัญญา: ${loanId || 'N/A'}\nวันที่: ${scheduledDate || 'N/A'}\n\nบันทึกการนัดหมายเรียบร้อยแล้ว`;
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
