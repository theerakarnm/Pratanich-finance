import {
  createNewLoanMessage,
  createBillingMessage,
  createDueWarningMessage,
  createDueDateMessage,
  createPaymentSuccessMessage,
  createOverdueMessage,
} from './flex-message.templates';

const examples = {
  'New Loan': createNewLoanMessage({
    contractNumber: 'LN-2023-001',
    principal: 50000,
    interestRate: 15,
    term: 12,
    startDate: '01/01/2023',
    dueDate: '01/01/2024',
    installmentAmount: 4500,
    paymentLink: 'https://example.com/contract/LN-2023-001',
  }),
  'Billing': createBillingMessage({
    month: 'มกราคม 2567',
    amount: 4500,
    dueDate: '25/01/2024',
    contractNumber: 'LN-2023-001',
    paymentLink: 'https://example.com/pay',
  }),
  'Due Warning': createDueWarningMessage({
    daysRemaining: 3,
    amount: 4500,
    dueDate: '25/01/2024',
    contractNumber: 'LN-2023-001',
    paymentLink: 'https://example.com/pay',
  }),
  'Due Date': createDueDateMessage({
    amount: 4500,
    contractNumber: 'LN-2023-001',
    paymentLink: 'https://example.com/pay',
  }),
  'Payment Success': createPaymentSuccessMessage({
    amount: 4500,
    paymentDate: '25/01/2024 10:30',
    receiptUrl: 'https://example.com/receipt/123',
    contractNumber: 'LN-2023-001',
    remainingBalance: 40000,
  }),
  'Overdue': createOverdueMessage({
    daysOverdue: 5,
    amount: 4500,
    contractNumber: 'LN-2023-001',
    penaltyAmount: 100,
    paymentLink: 'https://example.com/pay',
  }),
};

console.log(JSON.stringify(examples, null, 2));
