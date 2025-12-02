import { describe, it, expect } from 'bun:test';
import {
  createNewLoanMessage,
  createBillingMessage,
  createDueWarningMessage,
  createDueDateMessage,
  createPaymentSuccessMessage,
  createOverdueMessage,
} from './flex-message.templates';

describe('Flex Message Templates', () => {
  it('should create a valid New Loan message', () => {
    const message = createNewLoanMessage({
      contractNumber: 'LN-2023-001',
      principal: 50000,
      interestRate: 15,
      term: 12,
      startDate: '01/01/2023',
      dueDate: '01/01/2024',
      installmentAmount: 4500,
      paymentLink: 'https://example.com/contract/LN-2023-001',
    });

    expect(message.type).toBe('bubble');
    expect(message.header?.type).toBe('box');
    expect(message.body?.type).toBe('box');
    expect(message.footer?.type).toBe('box');
    // New Loan message doesn't have a hero image, it has QR code in footer
    expect(message.hero).toBeUndefined();
  });

  it('should create a valid Billing message', () => {
    const message = createBillingMessage({
      month: 'มกราคม 2567',
      amount: 4500,
      dueDate: '25/01/2024',
      contractNumber: 'LN-2023-001',
      paymentLink: 'https://example.com/pay',
    });

    expect(message.type).toBe('bubble');
    expect(message.header).toBeDefined();
    expect(message.body).toBeDefined();
    expect(message.footer).toBeDefined();
  });

  it('should create a valid Due Warning message', () => {
    const message = createDueWarningMessage({
      daysRemaining: 3,
      amount: 4500,
      dueDate: '25/01/2024',
      contractNumber: 'LN-2023-001',
      paymentLink: 'https://example.com/pay',
    });

    expect(message.type).toBe('bubble');
    expect(message.header).toBeDefined();
    expect(message.body).toBeDefined();
  });

  it('should create a valid Due Date message', () => {
    const message = createDueDateMessage({
      amount: 4500,
      contractNumber: 'LN-2023-001',
      paymentLink: 'https://example.com/pay',
    });

    expect(message.type).toBe('bubble');
    expect(message.header).toBeDefined();
    expect(message.body).toBeDefined();
  });

  it('should create a valid Payment Success message', () => {
    const message = createPaymentSuccessMessage({
      amount: 4500,
      paymentDate: '25/01/2024 10:30',
      receiptUrl: 'https://example.com/receipt/123',
      contractNumber: 'LN-2023-001',
      remainingBalance: 40000,
    });

    expect(message.type).toBe('bubble');
    expect(message.header).toBeDefined();
    expect(message.body).toBeDefined();
    expect(message.footer).toBeDefined();
    // Payment success doesn't need a hero image by default in this design, but let's check what we implemented
    // The implementation DOES NOT have a hero image for payment success.
    expect(message.hero).toBeUndefined();
  });

  it('should create a valid Overdue message', () => {
    const message = createOverdueMessage({
      daysOverdue: 5,
      amount: 4500,
      contractNumber: 'LN-2023-001',
      penaltyAmount: 100,
      paymentLink: 'https://example.com/pay',
    });

    expect(message.type).toBe('bubble');
    expect(message.header).toBeDefined();
    expect(message.body).toBeDefined();
    // Overdue message doesn't have a hero image, it has QR code in footer
    expect(message.hero).toBeUndefined();
  });
});
