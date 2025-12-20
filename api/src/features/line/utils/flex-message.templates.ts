import { FlexMessageBuilder } from './flex-message.builder';
import type { FlexMessage } from '../line.types';
import { generatePromptPayQrUrl } from '../../../utils/qrcode';

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

const PRIMARY_COLOR = '#1DB446'; // LINE Green
const DANGER_COLOR = '#FF3333';
const WARNING_COLOR = '#FFCC00';
const TEXT_COLOR_SECONDARY = '#8C8C8C';
const MOCK_QR_URL = 'https://picsum.photos/200';

/**
 * 1. New Loan Contract Notification
 * (แจ้งสัญญาใหม่: ใช้ถ้อยคำปกติได้ เพราะเป็นการแจ้งข้อมูลสัญญา)
 */
export function createNewLoanMessage(data: NewLoanData): FlexMessage {
  const builder = FlexMessageBuilder.createBubble();

  return builder
    .setHeader([
      builder.addText('แจ้งรายละเอียดสัญญาเงินกู้', { // ปรับจาก "สัญญาเงินกู้ฉบับใหม่" ให้ดูเป็นทางการ
        weight: 'bold',
        size: 'xl',
        color: PRIMARY_COLOR,
      }),
    ])

    .setBody([
      builder.addText('สินเชื่อได้รับการอนุมัติ', {
        weight: 'bold',
        size: 'md',
        align: 'center',
      }),
      builder.addSeparator({ margin: 'md' }),
      builder.createBox('vertical', [
        createDetailRow(builder, 'เลขที่สัญญา', data.contractNumber),
        createDetailRow(builder, 'ยอดเงินต้น', `฿${data.principal.toLocaleString()}`), // เปลี่ยน "ยอดเงินกู้" เป็น "ยอดเงินต้น" (Principal)
        createDetailRow(builder, 'ดอกเบี้ย', `${data.interestRate}%`),
        createDetailRow(builder, 'ระยะเวลาผ่อน', `${data.term} เดือน`),
        createDetailRow(builder, 'วันที่เริ่มสัญญา', data.startDate),
        createDetailRow(builder, 'วันครบกำหนด', data.dueDate),
        builder.addSeparator({ margin: 'md' }),
        createDetailRow(builder, 'ยอดผ่อนต่องวด', `฿${data.installmentAmount.toLocaleString()}`, true),
      ], { spacing: 'sm', margin: 'lg' }),
    ])
    .setFooter([
      builder.addImage(process.env.NODE_ENV === 'production' ? generatePromptPayQrUrl(data.installmentAmount) : MOCK_QR_URL, {
        size: 'md',
        aspectRatio: '1:1',
        aspectMode: 'cover',
        align: 'center',
        margin: 'md',
      }),
      builder.addButton('ตรวจสอบรายละเอียด', { // ปรับจาก "ดูรายละเอียดสัญญา"
        type: 'uri',
        uri: data.paymentLink,
      }, { style: 'primary', color: PRIMARY_COLOR }),
    ])
    .build();
}

/**
 * 2. Billing Notification (10-15 days before)
 * (แจ้งบิล: ใช้คำว่า "แจ้งยอด" แทนคำสั่งให้จ่าย)
 */
export function createBillingMessage(data: BillingData): FlexMessage {
  const builder = FlexMessageBuilder.createBubble();

  return builder
    .setHeader([
      builder.addText(`แจ้งยอดชำระเดือน ${data.month}`, { // ปรับจาก "บิลรอบเดือน" เป็น "แจ้งยอดชำระ"
        weight: 'bold',
        size: 'xl',
        color: '#333333',
      }),
    ])

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
      builder.addText(`กำหนดชำระ: ${data.dueDate}`, { // ปรับจาก "ครบกำหนด" เป็น "กำหนดชำระ"
        size: 'sm',
        color: PRIMARY_COLOR, // เปลี่ยนสีจาก DANGER เป็น PRIMARY เพื่อลดความกดดัน
        align: 'center',
        margin: 'sm',
      }),
      builder.addSeparator({ margin: 'xl' }),
      builder.createBox('vertical', [
        createDetailRow(builder, 'เลขที่สัญญา', data.contractNumber),
      ], { margin: 'lg' }),
    ])
    .setFooter([
      builder.addImage(process.env.NODE_ENV === 'production' ? generatePromptPayQrUrl(data.amount) : MOCK_QR_URL, {
        size: 'md',
        aspectRatio: '1:1',
        aspectMode: 'cover',
        align: 'center',
        margin: 'md',
      }),
      builder.addButton('ชำระเงิน', { // ปรับจาก "ชำระเงินทันที" ตัดคำว่า "ทันที" ออก
        type: 'uri',
        uri: data.paymentLink,
      }, { style: 'primary', color: PRIMARY_COLOR }),
    ])
    .build();
}

/**
 * 3. Warning Notification (D-3)
 * (แจ้งเตือนล่วงหน้า: เลี่ยงคำว่า "รักษาเครดิต" หากไม่ใช่ข้อมูลเครดิตบูโรจริง เพราะอาจเข้าข่ายหลอกลวง [cite: 66])
 */
export function createDueWarningMessage(data: DueWarningData): FlexMessage {
  const builder = FlexMessageBuilder.createBubble();

  return builder
    .setHeader([
      builder.createBox('horizontal', [
        builder.addText('🔔 แจ้งเตือนใกล้วันชำระ', { // เปลี่ยน icon และคำจาก "⚠️ แจ้งเตือนชำระเงิน"
          weight: 'bold',
          size: 'lg',
          color: WARNING_COLOR,
        }),
      ]),
    ])

    .setBody([
      builder.addText(`จะครบกำหนดในอีก ${data.daysRemaining} วัน`, {
        weight: 'bold',
        size: 'md', // ลดขนาดลงเล็กน้อย
        align: 'center',
        color: '#333333',
      }),
      builder.addText('โปรดเตรียมยอดเงินเพื่อชำระตามกำหนด', { // เปลี่ยนจาก "กรุณาชำระเพื่อรักษาเครดิต" เป็นข้อแนะนำแทน
        size: 'xs',
        color: TEXT_COLOR_SECONDARY,
        align: 'center',
      }),
      builder.addSeparator({ margin: 'lg' }),
      builder.createBox('vertical', [
        createDetailRow(builder, 'ยอดชำระ', `฿${data.amount.toLocaleString()}`, true),
        createDetailRow(builder, 'วันที่ครบกำหนด', data.dueDate),
        createDetailRow(builder, 'เลขที่สัญญา', data.contractNumber),
      ], { spacing: 'sm', margin: 'lg' }),
    ])
    .setFooter([
      builder.addImage(process.env.NODE_ENV === 'production' ? generatePromptPayQrUrl(data.amount) : MOCK_QR_URL, {
        size: 'md',
        aspectRatio: '1:1',
        aspectMode: 'cover',
        align: 'center',
        margin: 'md',
      }),
      builder.addButton('ชำระเงิน', {
        type: 'uri',
        uri: data.paymentLink,
      }, { style: 'primary', color: PRIMARY_COLOR }),
    ])
    .build();
}

/**
 * 4. Due Date Notification
 * (วันครบกำหนด: เลี่ยงคำขู่เรื่องค่าปรับ ใช้การแจ้งเตือนปกติ)
 */
export function createDueDateMessage(data: DueDateData): FlexMessage {
  const builder = FlexMessageBuilder.createBubble();

  return builder
    .setHeader([
      builder.addText('📅 ถึงกำหนดชำระวันนี้', { // เปลี่ยนจาก "วันนี้ครบกำหนดชำระ!" (ลดความตกใจ)
        weight: 'bold',
        size: 'xl',
        color: WARNING_COLOR, // ใช้สีเหลืองแทนแดง เพื่อความสุภาพ
      }),
    ])

    .setBody([
      builder.addText('กรุณาชำระภายในวันนี้', { // ตัด 23:59 น. ออกถ้าไม่จำเป็น หรือคงไว้ถ้าเป็นเงื่อนไขระบบ
        weight: 'bold',
        size: 'md',
        align: 'center',
        color: '#333333',
      }),
      builder.addText('เพื่อรักษาสถานะบัญชีปกติ', { // เปลี่ยนจาก "เพื่อหลีกเลี่ยงค่าปรับ" (ดูเป็นการขู่) เป็นเชิงบวก
        size: 'sm',
        color: TEXT_COLOR_SECONDARY,
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
        builder.addText(`เลขที่สัญญา: ${data.contractNumber}`, { size: 'xs', color: '#aaaaaa', align: 'center' }),
      ], { margin: 'lg' }),
    ])
    .setFooter([
      builder.addImage(process.env.NODE_ENV === 'production' ? generatePromptPayQrUrl(data.amount) : MOCK_QR_URL, {
        size: 'md',
        aspectRatio: '1:1',
        aspectMode: 'cover',
        align: 'center',
        margin: 'md',
      }),
      builder.addButton('ชำระเงิน', {
        type: 'uri',
        uri: data.paymentLink,
      }, { style: 'primary', color: PRIMARY_COLOR }),
    ])
    .build();
}

/**
 * 5. Payment Success Notification
 * (ไม่เปลี่ยนแปลง: เป็นข้อความเชิงบวก)
 */
export function createPaymentSuccessMessage(data: PaymentSuccessData): FlexMessage {
  const builder = FlexMessageBuilder.createBubble();

  return builder
    .setHeader([
      builder.addText('✅ ทำรายการสำเร็จ', { // ปรับเล็กน้อยให้เป็นกลาง
        weight: 'bold',
        size: 'xl',
        color: PRIMARY_COLOR,
      }),
    ])
    .setBody([
      builder.createBox('vertical', [
        builder.addText('ระบบได้รับยอดเงินเรียบร้อยแล้ว', { align: 'center', color: '#333333' }),
        builder.addText('ขอบคุณครับ/ค่ะ', { align: 'center', weight: 'bold', size: 'lg', margin: 'sm' }),
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
 * (ระวังมากที่สุด: ห้ามข่มขู่ ห้ามดูหมิ่น ห้ามแสดงข้อมูลเท็จเกี่ยวกับการดำเนินคดี [cite: 53, 66, 73])
 */
export function createOverdueMessage(data: OverdueData): FlexMessage {
  const builder = FlexMessageBuilder.createBubble();

  return builder
    .setHeader([
      builder.addText('แจ้งยอดค้างชำระ', { // ตัด "❌" และ "แจ้งเตือน" ออก เพื่อลดความก้าวร้าว
        weight: 'bold',
        size: 'xl',
        color: DANGER_COLOR, // สียังคงใช้สีแดงได้เพื่อสื่อถึงความสำคัญ แต่ข้อความต้องสุภาพ
      }),
    ])

    .setBody([
      builder.addText(`เกินกำหนดชำระ ${data.daysOverdue} วัน`, {
        weight: 'bold',
        size: 'lg',
        align: 'center',
        color: '#333333', // เปลี่ยนสี Text เป็นสีปกติ ไม่ใช้สีแดง เพื่อลดลักษณะการประจานหรือกดดันเกินไป
      }),
      builder.addText('กรุณาชำระยอดเพื่อให้สถานะบัญชีเป็นปกติ', { // เปลี่ยนจาก "เพื่อหลีกเลี่ยงดอกเบี้ยปรับ" (การทวงถามไม่ควรเน้นขู่เรื่องผลเสีย แต่เน้นวิธีแก้ไข)
        size: 'sm',
        color: '#333333',
        align: 'center',
        wrap: true,
      }),
      builder.addSeparator({ margin: 'lg' }),
      builder.createBox('vertical', [
        createDetailRow(builder, 'ยอดค้างชำระ', `฿${data.amount.toLocaleString()}`, true),
        // การแสดง "ค่าปรับ" (Penalty) สามารถทำได้หากมีในสัญญาจริง แต่ต้องระวังไม่ให้ดูเหมือนการขูดรีด [cite: 78]
        ...(data.penaltyAmount ? [createDetailRow(builder, 'ค่าธรรมเนียม/ค่าปรับ', `฿${data.penaltyAmount.toLocaleString()}`, false, TEXT_COLOR_SECONDARY)] : []),
        createDetailRow(builder, 'เลขที่สัญญา', data.contractNumber),
      ], { spacing: 'sm', margin: 'lg' }),
    ])
    .setFooter([
      builder.addImage(process.env.NODE_ENV === 'production' ? generatePromptPayQrUrl(data.amount) : MOCK_QR_URL, {
        size: 'md',
        aspectRatio: '1:1',
        aspectMode: 'cover',
        align: 'center',
        margin: 'md',
      }),
      builder.addButton('ชำระเงิน', { // ตัดคำว่า "ทันที" ออก
        type: 'uri',
        uri: data.paymentLink,
      }, { style: 'primary', color: DANGER_COLOR }), // ปุ่มสีแดงยังใช้ได้ เพื่อกระตุ้น Action (Call to Action)
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