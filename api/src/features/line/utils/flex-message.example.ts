/**
 * Example usage of FlexMessageBuilder
 * This file demonstrates how to use the FlexMessageBuilder to create LINE Flex Messages
 */

import { FlexMessageBuilder } from './flex-message.builder';

// Example 1: Simple loan details message
export function createLoanDetailsMessage(loanData: {
  contractNumber: string;
  principal: number;
  interestRate: number;
  term: number;
  status: string;
}) {
  const builder = FlexMessageBuilder.createBubble();

  const flexMessage = builder
    .setHeader([
      builder.addText('รายละเอียดสัญญากู้', {
        weight: 'bold',
        size: 'xl',
        color: '#1DB446',
      }),
    ])
    .setBody([
      builder.addText(`เลขที่สัญญา: ${loanData.contractNumber}`, {
        size: 'sm',
        wrap: true,
      }),
      builder.addSpacer('md'),
      builder.addText(`จำนวนเงินกู้: ฿${loanData.principal.toLocaleString()}`, {
        size: 'md',
        weight: 'bold',
      }),
      builder.addText(`อัตราดอกเบี้ย: ${loanData.interestRate}%`, {
        size: 'sm',
      }),
      builder.addText(`ระยะเวลา: ${loanData.term} เดือน`, {
        size: 'sm',
      }),
      builder.addSeparator({ margin: 'md' }),
      builder.addText(`สถานะ: ${loanData.status}`, {
        size: 'sm',
        color: loanData.status === 'Active' ? '#00B900' : '#999999',
      }),
    ])
    .setFooter([
      builder.addButton(
        'ชำระเงิน',
        {
          type: 'postback',
          data: JSON.stringify({
            action: 'make_payment',
            params: { contractNumber: loanData.contractNumber },
          }),
        },
        { style: 'primary', color: '#1DB446' }
      ),
      builder.addButton(
        'ดูประวัติการชำระ',
        {
          type: 'postback',
          data: JSON.stringify({
            action: 'view_payment_history',
            params: { contractNumber: loanData.contractNumber },
          }),
        },
        { style: 'secondary' }
      ),
    ])
    .build();

  return flexMessage;
}

// Example 2: Payment confirmation message
export function createPaymentConfirmationMessage(paymentData: {
  amount: number;
  date: string;
  contractNumber: string;
  remainingBalance: number;
}) {
  const builder = FlexMessageBuilder.createBubble();

  const flexMessage = builder
    .setHeader([
      builder.addText('✅ ชำระเงินสำเร็จ', {
        weight: 'bold',
        size: 'xl',
        color: '#00B900',
      }),
    ])
    .setBody([
      builder.createBox('vertical', [
        builder.addText('ยอดชำระ', { size: 'xs', color: '#999999' }),
        builder.addText(`฿${paymentData.amount.toLocaleString()}`, {
          size: 'xxl',
          weight: 'bold',
          color: '#00B900',
        }),
      ]),
      builder.addSeparator({ margin: 'lg' }),
      builder.createBox('vertical', [
        builder.addText(`วันที่: ${paymentData.date}`, { size: 'sm' }),
        builder.addText(`เลขที่สัญญา: ${paymentData.contractNumber}`, {
          size: 'sm',
        }),
        builder.addSpacer('md'),
        builder.addText(
          `ยอดคงเหลือ: ฿${paymentData.remainingBalance.toLocaleString()}`,
          {
            size: 'md',
            weight: 'bold',
          }
        ),
      ]),
    ])
    .build();

  return flexMessage;
}

// Example 3: Menu with multiple options
export function createMainMenuMessage() {
  const builder = FlexMessageBuilder.createBubble();

  const flexMessage = builder
    .setHeader([
      builder.addText('เมนูหลัก', {
        weight: 'bold',
        size: 'xl',
      }),
    ])
    .setBody([
      builder.addText('เลือกรายการที่ต้องการ', {
        size: 'sm',
        color: '#999999',
        wrap: true,
      }),
    ])
    .setFooter([
      builder.addButton(
        'ดูสัญญากู้ของฉัน',
        {
          type: 'postback',
          data: JSON.stringify({ action: 'view_my_loans' }),
        },
        { style: 'primary' }
      ),
      builder.addButton(
        'ชำระเงิน',
        {
          type: 'postback',
          data: JSON.stringify({ action: 'make_payment' }),
        },
        { style: 'primary' }
      ),
      builder.addButton(
        'ติดต่อเจ้าหน้าที่',
        {
          type: 'uri',
          uri: 'https://line.me/R/ti/p/@example',
        },
        { style: 'link' }
      ),
    ])
    .build();

  return flexMessage;
}
