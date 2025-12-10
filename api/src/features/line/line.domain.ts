import { logger } from '../../core/logger';
import type { LineMessagingClient } from './line.client';
import type { LineReplyUtil } from './utils/line-reply.util';
import type { LineEventRouter } from './line.router';
import type {
  LineWebhookBody,
  LineEvent,
  LineMessageEvent,
  LinePostbackEvent,
  LineTextMessage,
  LineImageMessage,
  PostbackData,
  EventContext,
} from './line.types';
import { extractEventContext } from './line.router';
import { LoansRepository } from '../loans/loans.repository';
import { ClientsRepository } from '../clients/clients.repository';
import { PaymentRepository } from '../payments/payments.repository';

/**
 * LINE Domain Layer
 * Orchestrates webhook processing and business logic for LINE events
 * Uses dependency injection for testability and maintainability
 */
export class LineDomain {
  constructor(
    private readonly client: LineMessagingClient,
    private readonly replyUtil: LineReplyUtil,
    private readonly eventRouter: LineEventRouter,
    private readonly loansRepo: LoansRepository,
    private readonly clientsRepo: ClientsRepository,
    private readonly paymentsRepo: PaymentRepository
  ) { }

  /**
   * Process incoming webhook from LINE
   * Handles multiple events sequentially
   * @param webhookBody - The webhook body from LINE
   * @throws Error if processing fails
   */
  async processWebhook(webhookBody: LineWebhookBody): Promise<void> {
    const { destination, events } = webhookBody;

    logger.info(
      {
        destination,
        eventCount: events.length,
        eventTypes: events.map(e => e.type),
      },
      'Processing LINE webhook'
    );

    if (!events || events.length === 0) {
      logger.warn({ destination }, 'Webhook received with no events');
      return;
    }

    // Process events sequentially to maintain order
    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      try {
        logger.debug(
          {
            eventIndex: i + 1,
            totalEvents: events.length,
            eventType: event.type,
            userId: event.source.userId,
          },
          'Processing event'
        );

        const context = extractEventContext(event);
        await this.eventRouter.routeEvent(event, context);

        logger.info(
          {
            eventIndex: i + 1,
            totalEvents: events.length,
            eventType: event.type,
          },
          'Event processed successfully'
        );
      } catch (error) {
        logger.error(
          {
            eventIndex: i + 1,
            totalEvents: events.length,
            eventType: event.type,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
          'Failed to process event'
        );

        // Attempt to send error message to user if we have a reply token
        await this.sendErrorMessage(event, error);
      }
    }

    logger.info(
      {
        destination,
        eventCount: events.length,
        processedCount: events.length,
      },
      'Webhook processing completed'
    );
  }

  /**
   * Handle text message events
   * Routes messages to appropriate business logic based on content
   * @param event - The text message event
   * @param replyToken - Reply token for sending response
   */
  async handleTextMessage(
    event: LineMessageEvent,
    replyToken: string
  ): Promise<void> {
    const message = event.message as LineTextMessage;
    const userId = event.source.userId;
    const text = message.text.trim();

    logger.info(
      {
        userId,
        messageId: message.id,
        textLength: text.length,
        textPreview: text.substring(0, 50),
      },
      'Handling text message'
    );

    // Route based on message content
    // This is where business logic integration happens
    try {
      let responseText: string;

      // Example routing logic - customize based on business requirements
      const lowerText = text.toLowerCase();

      if (lowerText.includes('สวัสดี') || lowerText.includes('hello') || lowerText.includes('hi')) {
        responseText = 'สวัสดีครับ! ยินดีให้บริการ\nพิมพ์ "เมนู" เพื่อดูตัวเลือก';
      } else if (lowerText.includes('เมนู') || lowerText.includes('menu')) {
        responseText = 'เมนูหลัก:\n1. ดูข้อมูลสัญญา (พิมพ์ "สัญญา")\n2. ชำระเงิน (พิมพ์ "ชำระ")\n3. ติดต่อเจ้าหน้าที่';
      } else if (lowerText.includes('สัญญา') || lowerText.includes('loan')) {
        const client = await this.clientsRepo.findByLineUserId(userId);
        if (!client) {
          responseText = 'ไม่พบข้อมูลของคุณในระบบ\nกรุณาติดต่อเจ้าหน้าที่เพื่อเชื่อมต่อบัญชี';
        } else {
          const loans = await this.loansRepo.findByClientId(client.id);
          if (loans.length === 0) {
            responseText = 'คุณไม่มีสัญญาที่ใช้งานอยู่ในขณะนี้';
          } else {
            responseText = 'รายการสัญญาของคุณ:\n' + loans.map(l => `- สัญญาเลขที่ ${l.contract_number} (สถานะ: ${l.contract_status})`).join('\n');
          }
        }
      } else if (lowerText.includes('ชำระ') || lowerText.includes('payment')) {
        const client = await this.clientsRepo.findByLineUserId(userId);
        if (!client) {
          responseText = 'ไม่พบข้อมูลของคุณในระบบ\nกรุณาติดต่อเจ้าหน้าที่เพื่อเชื่อมต่อบัญชี';
        } else {
          const loans = await this.loansRepo.findByClientId(client.id);
          const activeLoans = loans.filter(l => l.contract_status === 'Active' || l.contract_status === 'Overdue');

          if (activeLoans.length === 0) {
            responseText = 'ไม่พบยอดที่ต้องชำระในขณะนี้';
          } else {
            responseText = 'รายการที่ต้องชำระ:\n' + activeLoans.map(l =>
              `- สัญญา ${l.contract_number}\n  ยอดคงเหลือ: ${Number(l.outstanding_balance).toLocaleString()} บาท\n  ค่างวด: ${Number(l.installment_amount).toLocaleString()} บาท`
            ).join('\n\n');
          }
        }
      } else {
        responseText = 'ขออภัย ไม่เข้าใจคำสั่ง\nพิมพ์ "เมนู" เพื่อดูตัวเลือก';
      }

      await this.replyUtil.replyText(replyToken, responseText, userId);

      logger.info(
        {
          userId,
          messageId: message.id,
          responseLength: responseText.length,
        },
        'Text message handled successfully'
      );
    } catch (error) {
      logger.error(
        {
          userId,
          messageId: message.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to handle text message'
      );
      throw error;
    }
  }

  /**
   * Handle image message events
   * Downloads and processes image content
   * @param event - The image message event
   * @param replyToken - Reply token for sending response
   */
  async handleImageMessage(
    event: LineMessageEvent,
    replyToken: string
  ): Promise<void> {
    const message = event.message as LineImageMessage;
    const userId = event.source.userId;
    const messageId = message.id;

    logger.info(
      {
        userId,
        messageId,
        contentProvider: message.contentProvider.type,
      },
      'Handling image message'
    );

    try {
      // Download image content from LINE
      const { content: imageBuffer } = await this.client.getMessageContent(messageId);

      logger.info(
        {
          userId,
          messageId,
          imageSize: imageBuffer.length,
        },
        'Image downloaded successfully'
      );

      // Process the image based on business requirements
      // TODO: Integrate with document processing or storage service
      // For now, just acknowledge receipt
      const responseText = 'ได้รับรูปภาพของคุณแล้ว\nกำลังประมวลผล...';
      await this.replyUtil.replyText(replyToken, responseText, userId);

      // Here you would typically:
      // 1. Store the image in cloud storage
      // 2. Process the image (OCR, validation, etc.)
      // 3. Link the image to a client or loan record
      // 4. Send a follow-up message with results

      logger.info(
        {
          userId,
          messageId,
          imageSize: imageBuffer.length,
        },
        'Image message handled successfully'
      );
    } catch (error) {
      logger.error(
        {
          userId,
          messageId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to handle image message'
      );
      throw error;
    }
  }

  /**
   * Handle postback events from interactive buttons
   * Parses postback data and executes corresponding actions
   * @param event - The postback event
   * @param replyToken - Reply token for sending response
   */
  async handlePostback(
    event: LinePostbackEvent,
    replyToken: string
  ): Promise<void> {
    const userId = event.source.userId;
    const postbackDataString = event.postback.data;

    logger.info(
      {
        userId,
        postbackData: postbackDataString,
      },
      'Handling postback event'
    );

    try {
      // Parse postback data (expected to be JSON)
      let postbackData: PostbackData;

      try {
        postbackData = JSON.parse(postbackDataString) as PostbackData;
      } catch (parseError) {
        logger.error(
          {
            userId,
            postbackData: postbackDataString,
            error: parseError instanceof Error ? parseError.message : 'Unknown error',
          },
          'Failed to parse postback data'
        );

        await this.replyUtil.replyText(
          replyToken,
          'ขออภัย คำสั่งไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
          userId
        );
        return;
      }

      const { action, params } = postbackData;

      logger.debug(
        {
          userId,
          action,
          params,
        },
        'Postback data parsed successfully'
      );

      // Execute business logic based on action
      let responseText: string;

      switch (action) {
        case 'view_loan_details':
          if (!params?.loanId) {
            responseText = 'ไม่พบรหัสสัญญา';
            break;
          }
          const loan = await this.loansRepo.findById(params.loanId);
          if (!loan) {
            responseText = 'ไม่พบข้อมูลสัญญา';
          } else {
            responseText = `รายละเอียดสัญญา: ${loan.contract_number}\nยอดคงเหลือ: ${Number(loan.outstanding_balance).toLocaleString()} บาท\nสถานะ: ${loan.contract_status}`;
          }
          break;

        case 'make_payment':
          if (!params?.loanId) {
            responseText = 'ไม่พบรหัสสัญญา';
            break;
          }
          // For now, just show info. Real payment link generation would go here.
          responseText = 'กรุณาโอนเงินผ่านบัญชีธนาคาร...\n(ระบบชำระเงินออนไลน์กำลังพัฒนา)';
          break;

        case 'contact_support':
          responseText = 'ติดต่อเจ้าหน้าที่:\nโทร: 02-XXX-XXXX\nเวลา: จันทร์-ศุกร์ 9:00-17:00';
          break;

        case 'view_transactions':
          if (!params?.loanId) {
            responseText = 'ไม่พบรหัสสัญญา';
            break;
          }
          const transactions = await this.paymentsRepo.findPaymentHistory(params.loanId, 5, 0);
          if (transactions.length === 0) {
            responseText = 'ยังไม่มีประวัติการชำระเงิน';
          } else {
            responseText = 'ประวัติการชำระเงินล่าสุด:\n' + transactions.map(t =>
              `- ${new Date(t.payment_date).toLocaleDateString()}: ${Number(t.amount).toLocaleString()} บาท`
            ).join('\n');
          }
          break;

        default:
          logger.warn(
            {
              userId,
              action,
            },
            'Unknown postback action'
          );
          responseText = 'ขออภัย ไม่พบคำสั่งนี้ในระบบ';
      }

      await this.replyUtil.replyText(replyToken, responseText, userId);

      logger.info(
        {
          userId,
          action,
          params,
        },
        'Postback event handled successfully'
      );
    } catch (error) {
      logger.error(
        {
          userId,
          postbackData: postbackDataString,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Failed to handle postback event'
      );
      throw error;
    }
  }

  /**
   * Send error message to user when event processing fails
   * @param event - The event that failed
   * @param error - The error that occurred
   */
  private async sendErrorMessage(event: LineEvent, error: unknown): Promise<void> {
    try {
      const replyToken = event.replyToken;
      const userId = event.source.userId;

      if (!replyToken) {
        logger.warn(
          { userId, eventType: event.type },
          'Cannot send error message: no reply token'
        );
        return;
      }

      const errorMessage = 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';

      await this.replyUtil.replyText(replyToken, errorMessage, userId);

      logger.info(
        { userId, eventType: event.type },
        'Error message sent to user'
      );
    } catch (sendError) {
      logger.error(
        {
          eventType: event.type,
          userId: event.source.userId,
          originalError: error instanceof Error ? error.message : 'Unknown error',
          sendError: sendError instanceof Error ? sendError.message : 'Unknown error',
        },
        'Failed to send error message to user'
      );
      // Don't throw - we've already logged the failure
    }
  }
}
