import { logger } from '../../core/logger';
import type { LineReplyMessage } from './line.types';

interface LineApiErrorResponse {
  message: string;
  details?: Array<{
    message: string;
    property: string;
  }>;
}

export class LineMessagingClient {
  private readonly accessToken: string;
  private readonly apiUrl: string;

  constructor(accessToken: string, apiUrl: string) {
    this.accessToken = accessToken;
    this.apiUrl = apiUrl;
  }

  /**
   * Send reply messages using LINE Messaging API
   * @param replyToken - Reply token from webhook event
   * @param messages - Array of messages to send (max 5)
   * @throws Error if LINE API returns an error
   */
  async replyMessage(
    replyToken: string,
    messages: LineReplyMessage[]
  ): Promise<void> {
    if (!replyToken) {
      throw new Error('Reply token is required');
    }

    if (!messages || messages.length === 0) {
      throw new Error('At least one message is required');
    }

    if (messages.length > 5) {
      throw new Error('Maximum 5 messages allowed per reply');
    }

    const url = `${this.apiUrl}/message/reply`;
    const body = {
      replyToken,
      messages,
    };

    try {
      logger.info({ replyToken, messageCount: messages.length }, 'Sending LINE reply message');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json() as LineApiErrorResponse;
        const errorMessage = errorData.message || 'Unknown LINE API error';
        const errorDetails = errorData.details 
          ? errorData.details.map(d => `${d.property}: ${d.message}`).join(', ')
          : undefined;

        logger.error(
          { 
            status: response.status, 
            statusText: response.statusText,
            errorMessage,
            errorDetails,
            replyToken 
          }, 
          'LINE API reply message failed'
        );

        throw new Error(
          `LINE API error (${response.status}): ${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`
        );
      }

      logger.info({ replyToken }, 'LINE reply message sent successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('LINE API error')) {
        throw error;
      }

      logger.error({ error, replyToken }, 'Failed to send LINE reply message');
      throw new Error(`Failed to send LINE reply message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download image content from LINE
   * @param messageId - Message ID from image message event
   * @returns Buffer containing image data
   * @throws Error if download fails or content is too large
   */
  async getMessageContent(messageId: string): Promise<Buffer> {
    if (!messageId) {
      throw new Error('Message ID is required');
    }

    const url = `${this.apiUrl}/message/${messageId}/content`;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB

    try {
      logger.info({ messageId }, 'Downloading LINE message content');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json() as LineApiErrorResponse;
        const errorMessage = errorData.message || 'Unknown LINE API error';

        logger.error(
          { 
            status: response.status, 
            statusText: response.statusText,
            errorMessage,
            messageId 
          }, 
          'LINE API get message content failed'
        );

        throw new Error(
          `LINE API error (${response.status}): ${errorMessage}`
        );
      }

      // Check content length
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > MAX_SIZE) {
        logger.warn({ messageId, contentLength }, 'Message content exceeds maximum size');
        throw new Error(`Message content exceeds maximum size of ${MAX_SIZE} bytes`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Double-check actual size
      if (buffer.length > MAX_SIZE) {
        logger.warn({ messageId, actualSize: buffer.length }, 'Downloaded content exceeds maximum size');
        throw new Error(`Downloaded content exceeds maximum size of ${MAX_SIZE} bytes`);
      }

      logger.info(
        { messageId, size: buffer.length, contentType: response.headers.get('content-type') }, 
        'LINE message content downloaded successfully'
      );

      return buffer;
    } catch (error) {
      if (error instanceof Error && (error.message.includes('LINE API error') || error.message.includes('exceeds maximum size'))) {
        throw error;
      }

      logger.error({ error, messageId }, 'Failed to download LINE message content');
      throw new Error(`Failed to download LINE message content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Push messages to a user (not using reply token)
   * @param to - User ID, group ID, or room ID
   * @param messages - Array of messages to send (max 5)
   * @throws Error if LINE API returns an error
   */
  async pushMessage(
    to: string,
    messages: LineReplyMessage[]
  ): Promise<void> {
    if (!to) {
      throw new Error('Recipient ID is required');
    }

    if (!messages || messages.length === 0) {
      throw new Error('At least one message is required');
    }

    if (messages.length > 5) {
      throw new Error('Maximum 5 messages allowed per push');
    }

    const url = `${this.apiUrl}/message/push`;
    const body = {
      to,
      messages,
    };

    try {
      logger.info({ to, messageCount: messages.length }, 'Sending LINE push message');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json() as LineApiErrorResponse;
        const errorMessage = errorData.message || 'Unknown LINE API error';
        const errorDetails = errorData.details 
          ? errorData.details.map(d => `${d.property}: ${d.message}`).join(', ')
          : undefined;

        logger.error(
          { 
            status: response.status, 
            statusText: response.statusText,
            errorMessage,
            errorDetails,
            to 
          }, 
          'LINE API push message failed'
        );

        throw new Error(
          `LINE API error (${response.status}): ${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`
        );
      }

      logger.info({ to }, 'LINE push message sent successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('LINE API error')) {
        throw error;
      }

      logger.error({ error, to }, 'Failed to send LINE push message');
      throw new Error(`Failed to send LINE push message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
