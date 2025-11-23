import { logger } from '../../../core/logger';
import type { LineMessagingClient } from '../line.client';
import type { LineReplyMessage, FlexMessage } from '../line.types';

/**
 * Utility class for sending reply messages to LINE users
 * Provides convenient methods for different message types with logging
 */
export class LineReplyUtil {
  constructor(private readonly client: LineMessagingClient) {}

  /**
   * Send a text message reply
   * @param replyToken - Reply token from webhook event
   * @param text - Text message content
   * @param userId - Optional user ID for logging context
   * @throws Error if sending fails
   */
  async replyText(
    replyToken: string,
    text: string,
    userId?: string
  ): Promise<void> {
    const message: LineReplyMessage = {
      type: 'text',
      text,
    };

    logger.info(
      { 
        replyToken, 
        userId, 
        messageType: 'text',
        textLength: text.length 
      }, 
      'Sending text reply to LINE user'
    );

    try {
      await this.client.replyMessage(replyToken, [message]);
      
      logger.info(
        { replyToken, userId, messageType: 'text' }, 
        'Text reply sent successfully'
      );
    } catch (error) {
      logger.error(
        { error, replyToken, userId, messageType: 'text' }, 
        'Failed to send text reply'
      );
      throw error;
    }
  }

  /**
   * Send a flex message reply
   * @param replyToken - Reply token from webhook event
   * @param altText - Alternative text for notifications
   * @param flexMessage - Flex message content
   * @param userId - Optional user ID for logging context
   * @throws Error if sending fails
   */
  async replyFlex(
    replyToken: string,
    altText: string,
    flexMessage: FlexMessage,
    userId?: string
  ): Promise<void> {
    const message: LineReplyMessage = {
      type: 'flex',
      altText,
      contents: flexMessage,
    };

    logger.info(
      { 
        replyToken, 
        userId, 
        messageType: 'flex',
        flexType: flexMessage.type,
        altText 
      }, 
      'Sending flex message reply to LINE user'
    );

    try {
      await this.client.replyMessage(replyToken, [message]);
      
      logger.info(
        { replyToken, userId, messageType: 'flex', flexType: flexMessage.type }, 
        'Flex message reply sent successfully'
      );
    } catch (error) {
      logger.error(
        { error, replyToken, userId, messageType: 'flex' }, 
        'Failed to send flex message reply'
      );
      throw error;
    }
  }

  /**
   * Send multiple messages in a single reply
   * @param replyToken - Reply token from webhook event
   * @param messages - Array of messages to send (max 5)
   * @param userId - Optional user ID for logging context
   * @throws Error if sending fails or more than 5 messages provided
   */
  async replyMessages(
    replyToken: string,
    messages: LineReplyMessage[],
    userId?: string
  ): Promise<void> {
    if (messages.length > 5) {
      const error = new Error('Maximum 5 messages allowed per reply');
      logger.error(
        { replyToken, userId, messageCount: messages.length }, 
        'Attempted to send more than 5 messages'
      );
      throw error;
    }

    const messageTypes = messages.map(m => m.type);
    
    logger.info(
      { 
        replyToken, 
        userId, 
        messageCount: messages.length,
        messageTypes 
      }, 
      'Sending multiple messages reply to LINE user'
    );

    try {
      await this.client.replyMessage(replyToken, messages);
      
      logger.info(
        { 
          replyToken, 
          userId, 
          messageCount: messages.length,
          messageTypes 
        }, 
        'Multiple messages reply sent successfully'
      );
    } catch (error) {
      logger.error(
        { 
          error, 
          replyToken, 
          userId, 
          messageCount: messages.length,
          messageTypes 
        }, 
        'Failed to send multiple messages reply'
      );
      throw error;
    }
  }
}
