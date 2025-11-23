import { FlexMessageBuilder } from './flex-message.builder';
import type { FlexMessage } from '../line.types';

// Interfaces for data required by each template
export interface NewLoanData {
  contractNumber: string;
  principal: number;
  interestRate: number;
  term: number;
  startDate: string;
  dueDate: string;
  installmentAmount: number;
  paymentLink: string;
}

export interface BillingData {
  month: string;
  amount: number;
  dueDate: string;
  contractNumber: string;
  paymentLink: string;
}

export interface DueWarningData {
  daysRemaining: number;
  amount: number;
  dueDate: string;
  contractNumber: string;
  paymentLink: string;
}

export interface DueDateData {
  amount: number;
  contractNumber: string;
  paymentLink: string;
}

export interface PaymentSuccessData {
  amount: number;
  paymentDate: string;
  receiptUrl: string;
  contractNumber: string;
  remainingBalance: number;
}

export interface OverdueData {
  daysOverdue: number;
  amount: number;
  contractNumber: string;
  penaltyAmount?: number;
  paymentLink: string;
}

const MOCK_QR_CODE_URL = 'https://placehold.co/200x200/png?text=QR+Code';
const PRIMARY_COLOR = '#1DB446'; // LINE Green
const DANGER_COLOR = '#FF3333';
const WARNING_COLOR = '#FFCC00';
const TEXT_COLOR_SECONDARY = '#8C8C8C';

/**
 * 1. New Loan Contract Notification
 */
export function createNewLoanMessage(data: NewLoanData): FlexMessage {
  const builder = FlexMessageBuilder.createBubble();

  return builder
    .setHeader([
      builder.addText('สัญญาเงินกู้ฉบับใหม่', {
        weight: 'bold',
        size: 'xl',
        color: PRIMARY_COLOR,
      }),
    ])
    .setHero(
      builder.addImage(MOCK_QR_CODE_URL, {
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
      })
    )
    .setBody([
      builder.addText('อนุมัติสินเชื่อเรียบร้อยแล้ว', {
        weight: 'bold',
        size: 'md',
        align: 'center',
      }),
      builder.addSeparator({ margin: 'md' }),
      builder.createBox('vertical', [
        createDetailRow(builder, 'เลขที่สัญญา', data.contractNumber),
        createDetailRow(builder, 'ยอดเงินกู้', `฿${data.principal.toLocaleString()}`),
        createDetailRow(builder, 'ดอกเบี้ย', `${data.interestRate}%`),
        createDetailRow(builder, 'ระยะเวลา', `${data.term} เดือน`),
        createDetailRow(builder, 'เริ่มสัญญา', data.startDate),
        createDetailRow(builder, 'ครบกำหนดชำระ', data.dueDate),
        builder.addSeparator({ margin: 'md' }),
        createDetailRow(builder, 'ยอดผ่อนชำระ/งวด', `฿${data.installmentAmount.toLocaleString()}`, true),
      ], { spacing: 'sm', margin: 'lg' }),
    ])
    .setFooter([
      builder.addButton('ดูรายละเอียดสัญญา', {
        type: 'uri',
        uri: data.paymentLink, // Assuming link to contract details
      }, { style: 'primary', color: PRIMARY_COLOR }),
    ])
    .build();
}

/**
 * 2. Billing Notification (10-15 days before)
 */
export function createBillingMessage(data: BillingData): FlexMessage {
  const builder = FlexMessageBuilder.createBubble();

  return builder
    .setHeader([
      builder.addText(`บิลรอบเดือน ${data.month}`, {
        weight: 'bold',
        size: 'xl',
        color: '#333333',
      }),
    ])
    .setHero(
      builder.addImage(MOCK_QR_CODE_URL, {
        size: 'md',
        aspectRatio: '1:1',
        aspectMode: 'cover',
        align: 'center',
      })
    )
    .setBody([
      builder.addText('ยอดที่ต้องชำระ', {
        size: 'sm',
        color: TEXT_COLOR_SECONDARY,
        align: 'center',
      }),
      builder.addText(`฿${data.amount.toLocaleString()}`, {
        size: '3xl',
        weight: 'bold',
        color: '#333333',
        align: 'center',
      }),
      builder.addText(`ครบกำหนด: ${data.dueDate}`, {
        size: 'sm',
        color: DANGER_COLOR,
        align: 'center',
        margin: 'sm',
      }),
      builder.addSeparator({ margin: 'xl' }),
      builder.createBox('vertical', [
        createDetailRow(builder, 'เลขที่สัญญา', data.contractNumber),
      ], { margin: 'lg' }),
    ])
    .setFooter([
      builder.addButton('ชำระเงินทันที', {
        type: 'uri',
        uri: data.paymentLink,
      }, { style: 'primary', color: PRIMARY_COLOR }),
    ])
    .build();
}

/**
 * 3. Warning Notification (D-3)
 */
export function createDueWarningMessage(data: DueWarningData): FlexMessage {
  const builder = FlexMessageBuilder.createBubble();

  return builder
    .setHeader([
      builder.createBox('horizontal', [
        builder.addText('⚠️ แจ้งเตือนชำระเงิน', {
          weight: 'bold',
          size: 'lg',
          color: WARNING_COLOR,
        }),
      ]),
    ])
    .setHero(
      builder.addImage(MOCK_QR_CODE_URL, {
        size: 'md',
        aspectRatio: '1:1',
        aspectMode: 'cover',
        align: 'center',
      })
    )
    .setBody([
      builder.addText(`อีก ${data.daysRemaining} วันจะครบกำหนด`, {
        weight: 'bold',
        size: 'lg',
        align: 'center',
        color: '#333333',
      }),
      builder.addText('กรุณาชำระเพื่อรักษาเครดิต', {
        size: 'xs',
        color: TEXT_COLOR_SECONDARY,
        align: 'center',
      }),
      builder.addSeparator({ margin: 'lg' }),
      builder.createBox('vertical', [
        createDetailRow(builder, 'ยอดชำระ', `฿${data.amount.toLocaleString()}`, true),
        createDetailRow(builder, 'ครบกำหนด', data.dueDate),
        createDetailRow(builder, 'เลขที่สัญญา', data.contractNumber),
      ], { spacing: 'sm', margin: 'lg' }),
    ])
    .setFooter([
      builder.addButton('ชำระเงินทันที', {
        type: 'uri',
        uri: data.paymentLink,
      }, { style: 'primary', color: PRIMARY_COLOR }),
    ])
    .build();
}

/**
 * 4. Due Date Notification
 */
export function createDueDateMessage(data: DueDateData): FlexMessage {
  const builder = FlexMessageBuilder.createBubble();

  return builder
    .setHeader([
      builder.addText('📅 วันนี้ครบกำหนดชำระ!', {
        weight: 'bold',
        size: 'xl',
        color: DANGER_COLOR,
      }),
    ])
    .setHero(
      builder.addImage(MOCK_QR_CODE_URL, {
        size: 'md',
        aspectRatio: '1:1',
        aspectMode: 'cover',
        align: 'center',
      })
    )
    .setBody([
      builder.addText('กรุณาชำระภายใน 23:59 น.', {
        weight: 'bold',
        size: 'md',
        align: 'center',
        color: '#333333',
      }),
      builder.addText('เพื่อหลีกเลี่ยงค่าปรับ', {
        size: 'sm',
        color: DANGER_COLOR,
        align: 'center',
      }),
      builder.addSeparator({ margin: 'lg' }),
      builder.createBox('vertical', [
        builder.addText('ยอดที่ต้องชำระ', { size: 'sm', color: TEXT_COLOR_SECONDARY, align: 'center' }),
        builder.addText(`฿${data.amount.toLocaleString()}`, {
          size: 'xxl',
          weight: 'bold',
          color: PRIMARY_COLOR,
          align: 'center',
        }),
        builder.addSpacer('md'),
        builder.addText(`สัญญา: ${data.contractNumber}`, { size: 'xs', color: '#aaaaaa', align: 'center' }),
      ], { margin: 'lg' }),
    ])
    .setFooter([
      builder.addButton('ชำระเงินตอนนี้', {
        type: 'uri',
        uri: data.paymentLink,
      }, { style: 'primary', color: PRIMARY_COLOR }),
    ])
    .build();
}

/**
 * 5. Payment Success Notification
 */
export function createPaymentSuccessMessage(data: PaymentSuccessData): FlexMessage {
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
        builder.addText('ได้รับยอดเงินเรียบร้อยแล้ว', { align: 'center', color: '#333333' }),
        builder.addText('ขอบคุณค่ะ', { align: 'center', weight: 'bold', size: 'lg', margin: 'sm' }),
      ]),
      builder.addSeparator({ margin: 'lg' }),
      builder.createBox('vertical', [
        createDetailRow(builder, 'ยอดชำระ', `฿${data.amount.toLocaleString()}`, true),
        createDetailRow(builder, 'วันที่ชำระ', data.paymentDate),
        createDetailRow(builder, 'เลขที่สัญญา', data.contractNumber),
        builder.addSeparator({ margin: 'md' }),
        createDetailRow(builder, 'ยอดคงเหลือ', `฿${data.remainingBalance.toLocaleString()}`),
      ], { spacing: 'sm', margin: 'lg' }),
    ])
    .setFooter([
      builder.addButton('ดูใบเสร็จรับเงิน', {
        type: 'uri',
        uri: data.receiptUrl,
      }, { style: 'link', height: 'sm' }),
    ])
    .build();
}

/**
 * 6. Overdue Notification (D+1, D+3, D+7)
 */
export function createOverdueMessage(data: OverdueData): FlexMessage {
  const builder = FlexMessageBuilder.createBubble();

  return builder
    .setHeader([
      builder.addText('❌ แจ้งเตือนยอดค้างชำระ', {
        weight: 'bold',
        size: 'xl',
        color: DANGER_COLOR,
      }),
    ])
    .setHero(
      builder.addImage(MOCK_QR_CODE_URL, {
        size: 'md',
        aspectRatio: '1:1',
        aspectMode: 'cover',
        align: 'center',
      })
    )
    .setBody([
      builder.addText(`เกินกำหนด ${data.daysOverdue} วัน`, {
        weight: 'bold',
        size: 'lg',
        align: 'center',
        color: DANGER_COLOR,
      }),
      builder.addText('กรุณาชำระทันทีเพื่อหลีกเลี่ยงดอกเบี้ยปรับ', {
        size: 'xs',
        color: '#333333',
        align: 'center',
        wrap: true,
      }),
      builder.addSeparator({ margin: 'lg' }),
      builder.createBox('vertical', [
        createDetailRow(builder, 'ยอดค้างชำระ', `฿${data.amount.toLocaleString()}`, true),
        ...(data.penaltyAmount ? [createDetailRow(builder, 'ค่าปรับ', `฿${data.penaltyAmount.toLocaleString()}`, false, DANGER_COLOR)] : []),
        createDetailRow(builder, 'เลขที่สัญญา', data.contractNumber),
      ], { spacing: 'sm', margin: 'lg' }),
    ])
    .setFooter([
      builder.addButton('ชำระเงินทันที', {
        type: 'uri',
        uri: data.paymentLink,
      }, { style: 'primary', color: DANGER_COLOR }),
    ])
    .build();
}

// Helper to create a detail row (Label: Value)
function createDetailRow(
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
