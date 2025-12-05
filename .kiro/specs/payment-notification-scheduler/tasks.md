# Implementation Plan

- [x] 1. Create database schema and migration for notification history
  - Create notification history schema file with notification_type enum and table definition
  - Generate Drizzle migration for notification_history table
  - Create indexes for efficient querying (loan_id, notification_type, billing_period)
  - _Requirements: 6.4, 6.1_

- [x] 2. Implement notification types and data models
  - Create notification.types.ts with TypeScript interfaces for all notification data structures
  - Define NotificationType, NotificationHistory, NotificationJobResult types
  - Define BillingNotificationData, WarningNotificationData, DueDateNotificationData, OverdueNotificationData interfaces
  - Define LoanWithClient interface for joined query results
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 3. Implement notification history repository
- [x] 3.1 Create NotificationHistoryRepository class with CRUD operations
  - Implement create() method to insert notification records
  - Implement findByLoanAndType() method for duplicate checking
  - Implement findByLoan() method for audit queries
  - Use Drizzle ORM with proper error handling
  - _Requirements: 6.1, 6.4_

- [x] 3.2 Write property test for duplicate detection
  - **Property 5: Duplicate notification prevention**
  - **Validates: Requirements 1.3, 2.3, 3.3, 4.3, 6.1, 6.2, 6.3**

- [ ]* 3.3 Write unit tests for notification history repository
  - Test create() with valid data
  - Test findByLoanAndType() with existing and non-existing records
  - Test findByLoan() returns all notifications for a loan
  - _Requirements: 6.1, 6.4_

- [x] 4. Implement notification service for Flex Message generation
- [x] 4.1 Create NotificationService class
  - Implement createBillingNotification() using existing createBillingMessage template
  - Implement createWarningNotification() using existing createDueWarningMessage template
  - Implement createDueDateNotification() using existing createDueDateMessage template
  - Implement createOverdueNotification() using existing createOverdueMessage template
  - Implement generatePaymentLink() to create LIFF URLs with loan ID parameter
  - _Requirements: 1.4, 2.4, 3.4, 4.4, 8.1, 8.2_

- [ ]* 4.2 Write property test for template selection
  - **Property 8: Correct template selection**
  - **Validates: Requirements 1.4, 2.4, 3.4, 4.4**

- [ ]* 4.3 Write property test for payment link generation
  - **Property 11: Payment link inclusion**
  - **Property 12: Payment link encoding**
  - **Validates: Requirements 8.1, 8.2, 8.5**

- [ ]* 4.4 Write property test for payment link fallback
  - **Property 13: Payment link fallback**
  - **Validates: Requirements 8.4**

- [ ]* 4.5 Write unit tests for notification service
  - Test each notification type generates correct Flex Message structure
  - Test payment link format with various loan IDs
  - Test fallback behavior when LIFF URL is missing
  - _Requirements: 1.4, 2.4, 3.4, 4.4, 8.1, 8.2, 8.4_

- [x] 5. Extend loans repository with notification queries
- [x] 5.1 Add query methods to LoansRepository
  - Implement findLoansForBillingNotification() - due date 15 days from now, Active/Overdue status
  - Implement findLoansForWarningNotification() - due date 3 days from now, Active/Overdue, balance > 0
  - Implement findLoansForDueDateNotification() - due date today, Active/Overdue, balance > 0
  - Implement findLoansForOverdueNotification() - due date in past, Overdue status, days overdue 1/3/7
  - Include client information in queries using JOIN
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 5.1_

- [ ]* 5.2 Write property test for billing notification date filtering
  - **Property 1: Billing notification date filtering**
  - **Validates: Requirements 1.1, 1.2**

- [ ]* 5.3 Write property test for warning notification filtering
  - **Property 2: Warning notification date filtering**
  - **Validates: Requirements 2.1, 2.2**

- [ ]* 5.4 Write property test for due date notification filtering
  - **Property 3: Due date notification filtering**
  - **Validates: Requirements 3.1, 3.2**

- [ ]* 5.5 Write property test for overdue notification identification
  - **Property 4: Overdue notification identification**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ]* 5.6 Write unit tests for loan query methods
  - Test each query method with various loan datasets
  - Test date filtering edge cases
  - Test status filtering
  - Test balance filtering
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2_

- [ ] 6. Implement LINE user ID resolution logic
- [x] 6.1 Add method to ConnectRepository for LINE user ID lookup
  - Implement findActiveLineUserIdByClientId() method
  - Query connect_codes table for active connections
  - Return most recent active connection if multiple exist
  - Return null if no active connection found
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [ ]* 6.2 Write property test for LINE user ID resolution
  - **Property 9: LINE user ID resolution**
  - **Validates: Requirements 5.1, 5.2, 5.4**

- [ ]* 6.3 Write property test for missing LINE connection handling
  - **Property 10: Missing LINE connection handling**
  - **Validates: Requirements 5.3, 5.5**

- [ ]* 6.4 Write unit tests for LINE user ID resolution
  - Test with single active connection
  - Test with multiple active connections (returns most recent)
  - Test with no active connections (returns null)
  - Test with expired connections (returns null)
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 7. Implement notification scheduler domain
- [x] 7.1 Create NotificationSchedulerDomain class
  - Inject dependencies: LoansRepository, NotificationHistoryRepository, ConnectRepository, NotificationService, LineMessagingClient
  - Implement sendBillingNotifications() method
  - Implement sendWarningNotifications() method
  - Implement sendDueDateNotifications() method
  - Implement sendOverdueNotifications() method
  - Implement private processLoanNotification() helper method
  - Implement private getLineUserId() helper method
  - Implement private shouldSendNotification() helper method for duplicate checking
  - Add comprehensive structured logging for all operations
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.2, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 7.2 Write property test for notification history recording
  - **Property 6: Notification history recording**
  - **Validates: Requirements 1.5, 2.5, 3.5, 4.5, 6.4**

- [ ]* 7.3 Write property test for failed notification history exclusion
  - **Property 7: Failed notification history exclusion**
  - **Validates: Requirements 6.5, 9.5**

- [ ]* 7.4 Write property test for error isolation
  - **Property 14: Error isolation**
  - **Validates: Requirements 9.1, 9.2**

- [ ]* 7.5 Write unit tests for notification scheduler domain
  - Test sendBillingNotifications() end-to-end with mock dependencies
  - Test sendWarningNotifications() end-to-end
  - Test sendDueDateNotifications() end-to-end
  - Test sendOverdueNotifications() end-to-end
  - Test error handling for LINE API failures
  - Test error handling for missing LINE connections
  - Test duplicate prevention logic
  - Test notification history recording
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.5, 5.1-5.5, 6.1-6.5, 9.1, 9.2_

- [x] 8. Implement interest and balance calculation utilities
- [x] 8.1 Create calculation utility functions
  - Implement calculateAccruedInterest() function
  - Implement calculateTotalBalance() function
  - Implement calculatePenalty() function
  - Implement formatCurrency() function for Thai Baht formatting
  - Use dayjs for date calculations with Asia/Bangkok timezone
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 12.2, 12.3_

- [ ]* 8.2 Write property test for accrued interest calculation
  - **Property 16: Accrued interest calculation**
  - **Validates: Requirements 11.2**

- [ ]* 8.3 Write property test for balance calculation
  - **Property 17: Balance calculation accuracy**
  - **Validates: Requirements 11.3**

- [ ]* 8.4 Write property test for penalty calculation
  - **Property 18: Penalty calculation**
  - **Validates: Requirements 11.4**

- [ ]* 8.5 Write property test for currency formatting
  - **Property 19: Currency formatting**
  - **Validates: Requirements 11.5**

- [ ]* 8.6 Write property test for timezone consistency
  - **Property 20: Timezone consistency**
  - **Validates: Requirements 12.2, 12.3**

- [ ]* 8.7 Write property test for timestamp storage format
  - **Property 21: Timestamp storage format**
  - **Validates: Requirements 12.4**

- [ ]* 8.8 Write unit tests for calculation utilities
  - Test calculateAccruedInterest() with various date ranges and interest rates
  - Test calculateTotalBalance() with various principal and interest amounts
  - Test calculatePenalty() with various overdue days and penalty rates
  - Test formatCurrency() with various amounts
  - Test timezone conversions
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 12.2, 12.3, 12.4_

- [x] 9. Implement cron job initialization
- [x] 9.1 Create notification.cron.ts file
  - Install node-cron package if not using Bun.CronJob
  - Implement initializeNotificationJobs() function
  - Schedule billing notification job (daily 9:00 AM Asia/Bangkok)
  - Schedule warning notification job (daily 9:00 AM Asia/Bangkok)
  - Schedule due date notification job (daily 8:00 AM Asia/Bangkok)
  - Schedule overdue notification job (daily 10:00 AM Asia/Bangkok)
  - Implement stopNotificationJobs() function for graceful shutdown
  - Add error handling for cron initialization failures
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 12.1_

- [ ]* 9.2 Write unit tests for cron job initialization
  - Test that all jobs are initialized with correct schedules
  - Test that jobs can be stopped gracefully
  - Test error handling for invalid schedules
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. Integrate notification scheduler into application
- [x] 10.1 Update application entry point
  - Import and initialize notification scheduler in src/index.ts
  - Create singleton instances of all required dependencies
  - Call initializeNotificationJobs() after server starts
  - Add graceful shutdown handler to stop cron jobs on SIGTERM/SIGINT
  - Add environment variable checks for NOTIFICATION_ENABLED flag
  - _Requirements: 7.1_

- [x] 10.2 Write integration tests for notification scheduler
  - Test end-to-end notification flow with test database
  - Test cron job execution (manual trigger)
  - Test graceful shutdown
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.5_

- [ ] 11. Add configuration and environment variables
- [ ] 11.1 Update configuration
  - Add NOTIFICATION_ENABLED to config/index.ts
  - Add NOTIFICATION_TIMEZONE to config/index.ts
  - Add LINE_LIFF_URL to config/index.ts
  - Add validation for required notification configuration
  - Document all new environment variables in .env.example
  - _Requirements: 8.1, 8.2, 8.4, 12.1_

- [ ]* 11.2 Write unit tests for configuration
  - Test configuration loading with valid values
  - Test configuration validation with missing values
  - Test fallback values for optional configuration
  - _Requirements: 8.4_

- [x] 12. Create database migration
- [x] 12.1 Generate and test migration
  - Run `bun run db:generate` to create migration file
  - Review generated SQL for notification_history table
  - Test migration on development database
  - Verify indexes are created correctly
  - Test rollback if supported
  - _Requirements: 6.4_

- [x] 13. Add monitoring and logging enhancements
- [x] 13.1 Implement notification metrics tracking
  - Add structured logging for job start/end with timing
  - Add structured logging for notification counts (sent/failed)
  - Add structured logging for error details
  - Create helper function for logging notification job results
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 13.2 Write unit tests for logging helpers
  - Test that log messages contain required fields
  - Test that error logs include stack traces
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Create documentation
- [x] 15.1 Update API documentation
  - Document notification scheduler architecture in api/docs/
  - Document cron job schedules and timing
  - Document notification types and triggers
  - Document environment variables
  - Document database schema for notification_history
  - Add troubleshooting guide for common issues
  - _Requirements: All_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
