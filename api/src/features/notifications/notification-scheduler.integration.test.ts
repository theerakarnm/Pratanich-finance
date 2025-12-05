import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { NotificationSchedulerDomain } from './notification-scheduler.domain';
import { initializeNotificationJobs, stopNotificationJobs } from './notification.cron';
import type { LoansRepository } from '../loans/loans.repository';
import type { NotificationHistoryRepository } from './notification-history.repository';
import type { ConnectRepository } from '../connect/connect.repository';
import type { NotificationService } from './notification.service';
import type { LineMessagingClient } from '../line/line.client';
import type { LoanWithClient, NotificationHistory } from './notification.types';

/**
 * Integration tests for notification scheduler
 * Tests end-to-end notification flow with mock dependencies
 */

describe('NotificationScheduler Integration Tests', () => {
  let schedulerDomain: NotificationSchedulerDomain;
  let mockLoansRepo: LoansRepository;
  let mockHistoryRepo: NotificationHistoryRepository;
  let mockConnectRepo: ConnectRepository;
  let mockNotificationService: NotificationService;
  let mockLineClient: LineMessagingClient;

  // Track calls for verification
  let pushedMessages: Array<{ userId: string; messages: any[] }> = [];
  let createdHistory: NotificationHistory[] = [];

  beforeEach(() => {
    // Reset tracking arrays
    pushedMessages = [];
    createdHistory = [];

    // Create mock repositories and services
    mockLoansRepo = {
      findLoansForBillingNotification: async () => [],
      findLoansForWarningNotification: async () => [],
      findLoansForDueDateNotification: async () => [],
      findLoansForOverdueNotification: async () => [],
    } as any;

    mockHistoryRepo = {
      create: async (record: any) => {
        const history = {
          id: 'hist-' + Date.now(),
          ...record,
          sent_at: new Date(),
          created_at: new Date(),
        };
        createdHistory.push(history);
        return history;
      },
      findByLoanAndType: async () => null,
      findByLoan: async () => [],
    } as any;

    mockConnectRepo = {
      findActiveLineUserIdByClientId: async (clientId: string) => {
        return `line-user-${clientId}`;
      },
    } as any;

    mockNotificationService = {
      createBillingNotification: (data: any) => ({
        type: 'bubble',
        header: { type: 'box', layout: 'vertical', contents: [] },
        body: { type: 'box', layout: 'vertical', contents: [] },
      }),
      createWarningNotification: (data: any) => ({
        type: 'bubble',
        header: { type: 'box', layout: 'vertical', contents: [] },
        body: { type: 'box', layout: 'vertical', contents: [] },
      }),
      createDueDateNotification: (data: any) => ({
        type: 'bubble',
        header: { type: 'box', layout: 'vertical', contents: [] },
        body: { type: 'box', layout: 'vertical', contents: [] },
      }),
      createOverdueNotification: (data: any) => ({
        type: 'bubble',
        header: { type: 'box', layout: 'vertical', contents: [] },
        body: { type: 'box', layout: 'vertical', contents: [] },
      }),
      generatePaymentLink: (loanId: string) => `https://example.com/pay?loanId=${loanId}`,
    } as any;

    mockLineClient = {
      pushMessage: async (userId: string, messages: any[]) => {
        pushedMessages.push({ userId, messages });
      },
    } as any;

    schedulerDomain = new NotificationSchedulerDomain(
      mockLoansRepo,
      mockHistoryRepo,
      mockConnectRepo,
      mockNotificationService,
      mockLineClient
    );
  });

  afterEach(() => {
    // Clean up any running cron jobs
    try {
      stopNotificationJobs();
    } catch (error) {
      // Ignore errors if jobs weren't started
    }
  });

  describe('End-to-end notification flow', () => {
    it('should send billing notification and record history', async () => {
      // Setup: Mock loan data
      const mockLoan: LoanWithClient = {
        id: 'loan-123',
        contract_number: 'LN-2024-001',
        client_id: 'client-456',
        outstanding_balance: '5000.00',
        installment_amount: '1000.00',
        due_day: 25,
        contract_status: 'Active',
        overdue_days: 0,
        interest_rate: '2.5',
        term_months: 12,
        contract_start_date: '2024-01-01',
        total_penalties: '0.00',
        client_name: 'Test Client',
        client_phone: '0812345678',
      };

      mockLoansRepo.findLoansForBillingNotification = async () => [mockLoan];

      // Execute
      const result = await schedulerDomain.sendBillingNotifications();

      // Verify
      expect(result.loansProcessed).toBe(1);
      expect(result.notificationsSent).toBe(1);
      expect(result.notificationsFailed).toBe(0);
      expect(pushedMessages.length).toBe(1);
      expect(pushedMessages[0].userId).toBe('line-user-client-456');
      expect(createdHistory.length).toBe(1);
      expect(createdHistory[0].notification_type).toBe('billing');
      expect(createdHistory[0].send_status).toBe('sent');
    });

    it('should handle missing LINE connection gracefully', async () => {
      // Setup: Mock loan with no LINE connection
      const mockLoan: LoanWithClient = {
        id: 'loan-789',
        contract_number: 'LN-2024-002',
        client_id: 'client-no-line',
        outstanding_balance: '3000.00',
        installment_amount: '500.00',
        due_day: 15,
        contract_status: 'Active',
        overdue_days: 0,
        interest_rate: '2.0',
        term_months: 6,
        contract_start_date: '2024-01-01',
        total_penalties: '0.00',
        client_name: 'No LINE Client',
        client_phone: '0898765432',
      };

      mockLoansRepo.findLoansForWarningNotification = async () => [mockLoan];
      mockConnectRepo.findActiveLineUserIdByClientId = async () => null;

      // Execute
      const result = await schedulerDomain.sendWarningNotifications();

      // Verify
      expect(result.loansProcessed).toBe(1);
      expect(result.notificationsSent).toBe(0);
      expect(result.notificationsFailed).toBe(1);
      expect(pushedMessages.length).toBe(0);
      expect(createdHistory.length).toBe(0);
    });

    it('should prevent duplicate notifications', async () => {
      // Setup: Mock loan and existing history
      const mockLoan: LoanWithClient = {
        id: 'loan-duplicate',
        contract_number: 'LN-2024-003',
        client_id: 'client-dup',
        outstanding_balance: '2000.00',
        installment_amount: '400.00',
        due_day: 10,
        contract_status: 'Active',
        overdue_days: 0,
        interest_rate: '1.5',
        term_months: 5,
        contract_start_date: '2024-01-01',
        total_penalties: '0.00',
        client_name: 'Duplicate Test',
        client_phone: '0887654321',
      };

      mockLoansRepo.findLoansForDueDateNotification = async () => [mockLoan];
      
      // Mock existing notification history
      mockHistoryRepo.findByLoanAndType = async () => ({
        id: 'existing-hist',
        loan_id: 'loan-duplicate',
        client_id: 'client-dup',
        line_user_id: 'line-user-client-dup',
        notification_type: 'due_date',
        billing_period: new Date().toISOString().slice(0, 7),
        send_status: 'sent',
        sent_at: new Date(),
        created_at: new Date(),
      });

      // Execute
      const result = await schedulerDomain.sendDueDateNotifications();

      // Verify
      expect(result.loansProcessed).toBe(1);
      expect(result.notificationsSent).toBe(0);
      expect(result.notificationsFailed).toBe(1);
      expect(pushedMessages.length).toBe(0);
    });

    it('should process multiple loans in batch', async () => {
      // Setup: Multiple mock loans
      const mockLoans: LoanWithClient[] = [
        {
          id: 'loan-1',
          contract_number: 'LN-2024-001',
          client_id: 'client-1',
          outstanding_balance: '5000.00',
          installment_amount: '1000.00',
          due_day: 25,
          contract_status: 'Overdue',
          overdue_days: 3,
          interest_rate: '2.5',
          term_months: 12,
          contract_start_date: '2024-01-01',
          total_penalties: '150.00',
          client_name: 'Client 1',
          client_phone: '0812345678',
        },
        {
          id: 'loan-2',
          contract_number: 'LN-2024-002',
          client_id: 'client-2',
          outstanding_balance: '3000.00',
          installment_amount: '600.00',
          due_day: 15,
          contract_status: 'Overdue',
          overdue_days: 7,
          interest_rate: '2.0',
          term_months: 6,
          contract_start_date: '2024-01-01',
          total_penalties: '350.00',
          client_name: 'Client 2',
          client_phone: '0898765432',
        },
      ];

      mockLoansRepo.findLoansForOverdueNotification = async () => mockLoans;

      // Execute
      const result = await schedulerDomain.sendOverdueNotifications();

      // Verify
      expect(result.loansProcessed).toBe(2);
      expect(result.notificationsSent).toBe(2);
      expect(result.notificationsFailed).toBe(0);
      expect(pushedMessages.length).toBe(2);
      expect(createdHistory.length).toBe(2);
    });

    it('should isolate errors and continue processing remaining loans', async () => {
      // Setup: Multiple loans, one will fail
      const mockLoans: LoanWithClient[] = [
        {
          id: 'loan-success',
          contract_number: 'LN-2024-001',
          client_id: 'client-success',
          outstanding_balance: '5000.00',
          installment_amount: '1000.00',
          due_day: 25,
          contract_status: 'Active',
          overdue_days: 0,
          interest_rate: '2.5',
          term_months: 12,
          contract_start_date: '2024-01-01',
          total_penalties: '0.00',
          client_name: 'Success Client',
          client_phone: '0812345678',
        },
        {
          id: 'loan-fail',
          contract_number: 'LN-2024-002',
          client_id: 'client-fail',
          outstanding_balance: '3000.00',
          installment_amount: '600.00',
          due_day: 15,
          contract_status: 'Active',
          overdue_days: 0,
          interest_rate: '2.0',
          term_months: 6,
          contract_start_date: '2024-01-01',
          total_penalties: '0.00',
          client_name: 'Fail Client',
          client_phone: '0898765432',
        },
      ];

      mockLoansRepo.findLoansForBillingNotification = async () => mockLoans;
      
      // Mock LINE client to fail for second loan
      let callCount = 0;
      mockLineClient.pushMessage = async (userId: string, messages: any[]) => {
        callCount++;
        if (callCount === 2) {
          throw new Error('LINE API error');
        }
        pushedMessages.push({ userId, messages });
      };

      // Execute
      const result = await schedulerDomain.sendBillingNotifications();

      // Verify
      expect(result.loansProcessed).toBe(2);
      expect(result.notificationsSent).toBe(1);
      expect(result.notificationsFailed).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].loanId).toBe('loan-fail');
    });
  });

  describe('Cron job initialization', () => {
    it('should initialize notification jobs without errors', () => {
      // Execute
      expect(() => {
        initializeNotificationJobs(schedulerDomain);
      }).not.toThrow();
    });

    it('should stop notification jobs gracefully', () => {
      // Setup
      initializeNotificationJobs(schedulerDomain);

      // Execute
      expect(() => {
        stopNotificationJobs();
      }).not.toThrow();
    });

    it('should handle stopping jobs when not initialized', () => {
      // Execute - should not throw even if jobs weren't started
      expect(() => {
        stopNotificationJobs();
      }).not.toThrow();
    });
  });
});
