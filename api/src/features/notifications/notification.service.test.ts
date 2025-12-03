import { describe, it, expect } from 'bun:test';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  describe('createBillingNotification', () => {
    it('should create a valid billing notification Flex Message', () => {
      const service = new NotificationService('https://liff.line.me/test');
      
      const message = service.createBillingNotification({
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
  });

  describe('createWarningNotification', () => {
    it('should create a valid warning notification Flex Message', () => {
      const service = new NotificationService('https://liff.line.me/test');
      
      const message = service.createWarningNotification({
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
  });

  describe('createDueDateNotification', () => {
    it('should create a valid due date notification Flex Message', () => {
      const service = new NotificationService('https://liff.line.me/test');
      
      const message = service.createDueDateNotification({
        amount: 4500,
        contractNumber: 'LN-2023-001',
        paymentLink: 'https://example.com/pay',
      });

      expect(message.type).toBe('bubble');
      expect(message.header).toBeDefined();
      expect(message.body).toBeDefined();
    });
  });

  describe('createOverdueNotification', () => {
    it('should create a valid overdue notification Flex Message', () => {
      const service = new NotificationService('https://liff.line.me/test');
      
      const message = service.createOverdueNotification({
        daysOverdue: 5,
        amount: 4500,
        contractNumber: 'LN-2023-001',
        penaltyAmount: 100,
        paymentLink: 'https://example.com/pay',
      });

      expect(message.type).toBe('bubble');
      expect(message.header).toBeDefined();
      expect(message.body).toBeDefined();
    });

    it('should create overdue notification without penalty amount', () => {
      const service = new NotificationService('https://liff.line.me/test');
      
      const message = service.createOverdueNotification({
        daysOverdue: 1,
        amount: 4500,
        contractNumber: 'LN-2023-001',
        paymentLink: 'https://example.com/pay',
      });

      expect(message.type).toBe('bubble');
      expect(message.header).toBeDefined();
      expect(message.body).toBeDefined();
    });
  });

  describe('generatePaymentLink', () => {
    it('should generate payment link with LIFF URL and loan ID parameter', () => {
      const service = new NotificationService('https://liff.line.me/test');
      
      const link = service.generatePaymentLink('loan-123');
      
      expect(link).toBe('https://liff.line.me/test?loanId=loan-123');
    });

    it('should append loan ID to existing query parameters', () => {
      const service = new NotificationService('https://liff.line.me/test?param=value');
      
      const link = service.generatePaymentLink('loan-456');
      
      expect(link).toBe('https://liff.line.me/test?param=value&loanId=loan-456');
    });

    it('should encode special characters in loan ID', () => {
      const service = new NotificationService('https://liff.line.me/test');
      
      const link = service.generatePaymentLink('loan-123&special=value');
      
      expect(link).toContain('loanId=loan-123%26special%3Dvalue');
    });

    it('should use fallback URL when LIFF URL is not configured', () => {
      const service = new NotificationService();
      
      const link = service.generatePaymentLink('loan-789');
      
      expect(link).toBe('https://example.com/payment?loanId=loan-789');
    });

    it('should encode special characters in fallback URL', () => {
      const service = new NotificationService();
      
      const link = service.generatePaymentLink('loan-123&test=value');
      
      expect(link).toContain('loanId=loan-123%26test%3Dvalue');
    });
  });
});
