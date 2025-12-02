import { LineMessagingClient } from '../line/line.client';
import { FlexMessageBuilder } from '../line/utils/flex-message.builder';
import { logger } from '../../core/logger';
import type { PaymentNotificationData, LoanClosedNotificationData } from './payments.types';
import type { FlexMessage } from '../line/line.types';

const PRIMARY_COLOR = '#1DB446'; // LINE Green
const TEXT_COLOR_SECONDARY = '#8C8C8C';

/**
 * Service for sending payment-related notifications via LINE
 */
export class PaymentNotificationService {
  constructor(private readonly lineClient: LineMessagingClient) {}

  /**
   * Send payment confirmation to client via LINE
   * Does not throw errors - logs failures instead
   */
  async sendPaymentConfirmation(
    lineUserId: string,
    paymentData: PaymentNotificationData
  ): Promise<void> {
    try {
      logger.info(
        {
          lineUserId,
          transactionRefId: paymentData.transactionRefId,
          amount: paymentData.amount,
        },
        'Sending payment confirmation notification'
      );

      const flexMessage = this.createPaymentConfirmationMessage(paymentData);

      await this.lineClient.pushMessage(lineUserId, [
        {
          type: 'flex',
          altText: `ชำระเงินสำเร็จ ฿${paymentData.amount.toLocaleString()}`,
          contents: flexMessage,
        },
      ]);

      logger.info(
        { lineUserId, transactionRefId: paymentData.transactionRefId },
        'Payment confirmation notification sent successfully'
      );
    } catch (error) {
      // Log error but don't throw - notification failures should not fail payment processing
      logger.error(
        {
          error,
          lineUserId,
          transactionRefId: paymentData.transactionRefId,
        },
        'Failed to send payment confirmation notification'
      );
    }
  }

  /**
   * Send loan paid-off celebration message
   * Does not throw errors - logs failures instead
   */
  async sendLoanClosedNotification(
    lineUserId: string,
    loanData: LoanClosedNotificationData
  ): Promise<void> {
    try {
      logger.info(
        {
          lineUserId,
          contractNumber: loanData.contractNumber,
          totalPaid: loanData.totalPaid,
        },
        'Sending loan closed notification'
      );

      const flexMessage = this.createLoanClosedMessage(loanData);

      await this.lineClient.pushMessage(lineUserId, [
        {
          type: 'flex',
          altText: `🎉 ยินดีด้วย! ชำระสัญญา ${loanData.contractNumber} ครบแล้ว`,
          contents: flexMessage,
        },
      ]);

      logger.info(
        { lineUserId, contractNumber: loanData.contractNumber },
        'Loan closed notification sent successfully'
      );
    } catch (error) {
      // Log error but don't throw - notification failures should not fail payment processing
      logger.error(
        {
          error,
          lineUserId,
          contractNumber: loanData.contractNumber,
        },
        'Failed to send loan closed notification'
      );
    }
  }

  /**
   * Create Flex Message for payment confirmation
   */
  private createPaymentConfirmationMessage(
    data: PaymentNotificationData
  ): FlexMessage {
    const builder = FlexMessageBuilder.createBubble();

    return builder
      .setHeader([
        builder.addText('✅ ชำระเงินสำเร็จ', {
          weight: 'bold',
          size: 'xl',
          color: PRIMARY_COLOR,
        }),
      ])
      .setBody([
        builder.createBox('vertical', [
          builder.addText('ได้รับยอดเงินเรียบร้อยแล้ว', {
            align: 'center',
            color: '#333333',
          }),
          builder.addText('ขอบคุณค่ะ', {
            align: 'center',
            weight: 'bold',
            size: 'lg',
            margin: 'sm',
          }),
        ]),
        builder.addSeparator({ margin: 'lg' }),
        builder.createBox(
          'vertical',
          [
            this.createDetailRow(
              builder,
              'ยอดชำระ',
              `฿${data.amount.toLocaleString()}`,
              true
            ),
            this.createDetailRow(
              builder,
              'วันที่ชำระ',
              this.formatDate(data.paymentDate)
            ),
            this.createDetailRow(
              builder,
              'เลขที่สัญญา',
              data.contractNumber
            ),
            builder.addSeparator({ margin: 'md' }),
            builder.addText('การจัดสรรเงิน', {
              size: 'sm',
              weight: 'bold',
              color: '#333333',
              margin: 'md',
            }),
            ...(data.allocation.toPenalties > 0
              ? [
                  this.createDetailRow(
                    builder,
                    '  ค่าปรับ',
                    `฿${data.allocation.toPenalties.toLocaleString()}`
                  ),
                ]
              : []),
            ...(data.allocation.toInterest > 0
              ? [
                  this.createDetailRow(
                    builder,
                    '  ดอกเบี้ย',
                    `฿${data.allocation.toInterest.toLocaleString()}`
                  ),
                ]
              : []),
            ...(data.allocation.toPrincipal > 0
              ? [
                  this.createDetailRow(
                    builder,
                    '  เงินต้น',
                    `฿${data.allocation.toPrincipal.toLocaleString()}`
                  ),
                ]
              : []),
            builder.addSeparator({ margin: 'md' }),
            this.createDetailRow(
              builder,
              'ยอดคงเหลือ',
              `฿${data.balanceAfter.toLocaleString()}`,
              true,
              data.balanceAfter === 0 ? PRIMARY_COLOR : '#333333'
            ),
          ],
          { spacing: 'sm', margin: 'lg' }
        ),
      ])
      .setFooter([
        builder.addText(`อ้างอิง: ${data.transactionRefId}`, {
          size: 'xxs',
          color: TEXT_COLOR_SECONDARY,
          align: 'center',
        }),
      ])
      .build();
  }

  /**
   * Create Flex Message for loan closed notification
   */
  private createLoanClosedMessage(
    data: LoanClosedNotificationData
  ): FlexMessage {
    const builder = FlexMessageBuilder.createBubble();

    return builder
      .setHeader([
        builder.addText('🎉 ยินดีด้วย!', {
          weight: 'bold',
          size: 'xxl',
          color: PRIMARY_COLOR,
          align: 'center',
        }),
      ])
      .setBody([
        builder.createBox('vertical', [
          builder.addText('คุณชำระสัญญาครบแล้ว', {
            align: 'center',
            weight: 'bold',
            size: 'lg',
            color: '#333333',
          }),
          builder.addText('ขอบคุณที่ไว้วางใจเรา', {
            align: 'center',
            size: 'md',
            color: TEXT_COLOR_SECONDARY,
            margin: 'sm',
          }),
        ]),
        builder.addSeparator({ margin: 'xl' }),
        builder.createBox(
          'vertical',
          [
            this.createDetailRow(
              builder,
              'เลขที่สัญญา',
              data.contractNumber,
              true
            ),
            this.createDetailRow(
              builder,
              'ยอดชำระทั้งหมด',
              `฿${data.totalPaid.toLocaleString()}`,
              true,
              PRIMARY_COLOR
            ),
            this.createDetailRow(
              builder,
              'วันที่ชำระครบ',
              this.formatDate(data.finalPaymentDate)
            ),
          ],
          { spacing: 'md', margin: 'lg' }
        ),
        builder.addSeparator({ margin: 'xl' }),
        builder.createBox('vertical', [
          builder.addText('🌟 สถานะสัญญา: ปิดแล้ว', {
            align: 'center',
            weight: 'bold',
            size: 'md',
            color: PRIMARY_COLOR,
          }),
          builder.addText('หากต้องการสินเชื่อเพิ่มเติม', {
            align: 'center',
            size: 'xs',
            color: TEXT_COLOR_SECONDARY,
            margin: 'md',
          }),
          builder.addText('ติดต่อเราได้ทุกเมื่อ', {
            align: 'center',
            size: 'xs',
            color: TEXT_COLOR_SECONDARY,
          }),
        ]),
      ])
      .build();
  }

  /**
   * Helper to create a detail row (Label: Value)
   */
  private createDetailRow(
    builder: FlexMessageBuilder,
    label: string,
    value: string,
    isBoldValue: boolean = false,
    valueColor: string = '#333333'
  ) {
    return builder.createBox('horizontal', [
      builder.addText(label, {
        size: 'sm',
        color: TEXT_COLOR_SECONDARY,
        flex: 4,
      }),
      builder.addText(value, {
        size: 'sm',
        color: valueColor,
        align: 'end',
        weight: isBoldValue ? 'bold' : 'regular',
        flex: 6,
        wrap: true,
      }),
    ]);
  }

  /**
   * Format date to Thai locale string
   */
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}
