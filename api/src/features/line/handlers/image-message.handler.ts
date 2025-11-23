import { logger } from '../../../core/logger';
import type { EventHandler } from '../line.router';
import type { LineEvent, LineMessageEvent, EventContext } from '../line.types';
import type { LineMessagingClient } from '../line.client';
import type { LineReplyUtil } from '../utils/line-reply.util';

/**
 * Fallback error messages for image message handling
 */
const FALLBACK_MESSAGES = {
  IMAGE_ERROR: 'ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่',
  IMAGE_TOO_LARGE: 'รูปภาพมีขนาดใหญ่เกินไป กรุณาส่งรูปภาพที่มีขนาดไม่เกิน 10MB',
  DOWNLOAD_ERROR: 'ไม่สามารถดาวน์โหลดรูปภาพได้ กรุณาลองใหม่',
  PROCESSING_ERROR: 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ',
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
    private readonly replyUtil: LineReplyUtil
  ) {}

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

    logger.info(
      {
        userId,
        messageId,
        contentProviderType: contentProvider.type,
      },
      'Processing image message from LINE user'
    );

    try {
      // Download image content from LINE
      const imageBuffer = await this.downloadImage(messageId, userId);

      // Validate image size
      this.validateImageSize(imageBuffer, messageId, userId);

      // Process the image
      await this.processImage(imageBuffer, messageId, userId);

      // Send confirmation response
      await this.replyUtil.replyText(
        replyToken,
        'ได้รับรูปภาพของคุณเรียบร้อยแล้ว กำลังดำเนินการตรวจสอบ',
        userId
      );

      logger.info(
        {
          userId,
          messageId,
          imageSize: imageBuffer.length,
        },
        'Image message processed successfully'
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          messageId,
        },
        'Error processing image message'
      );

      // Send appropriate fallback error message
      await this.sendFallbackMessage(replyToken, userId, error);
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

      const imageBuffer = await this.client.getMessageContent(messageId);

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
   * Processes the downloaded image according to business requirements
   * @param imageBuffer - The image data buffer
   * @param messageId - The message ID
   * @param userId - The LINE user ID
   */
  private async processImage(
    imageBuffer: Buffer,
    messageId: string,
    userId: string
  ): Promise<void> {
    logger.info(
      {
        userId,
        messageId,
        imageSize: imageBuffer.length,
      },
      'Processing image content'
    );

    try {
      // TODO: Implement actual image processing logic
      // This is a placeholder that will be replaced with actual business logic
      // Possible implementations:
      // - Save image to storage (S3, local filesystem, etc.)
      // - Extract text from image (OCR)
      // - Validate document type
      // - Associate image with client/loan record
      // - Trigger document verification workflow

      // For now, just log that we received the image
      logger.debug(
        {
          userId,
          messageId,
          imageSize: imageBuffer.length,
        },
        'Image processing placeholder - implement actual business logic here'
      );

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 100));

      logger.info(
        { userId, messageId },
        'Image processing completed successfully'
      );
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId,
          messageId,
        },
        'Error during image processing'
      );

      throw new Error('PROCESSING_ERROR');
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
      let fallbackText = FALLBACK_MESSAGES.IMAGE_ERROR;

      if (errorMessage.includes('IMAGE_TOO_LARGE') || errorMessage.includes('exceeds maximum size')) {
        fallbackText = FALLBACK_MESSAGES.IMAGE_TOO_LARGE;
      } else if (errorMessage.includes('DOWNLOAD_ERROR') || errorMessage.includes('download')) {
        fallbackText = FALLBACK_MESSAGES.DOWNLOAD_ERROR;
      } else if (errorMessage.includes('PROCESSING_ERROR') || errorMessage.includes('processing')) {
        fallbackText = FALLBACK_MESSAGES.PROCESSING_ERROR;
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
