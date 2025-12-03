# Design Document

## Overview

The Payment Notification Scheduler is an automated system that proactively sends payment reminders to clients via LINE messaging at strategic intervals before and after payment due dates. The system uses cron-based scheduling to run periodic jobs that identify loans requiring notifications, generate rich Flex Messages using existing templates, and maintain notification history to prevent duplicates.

The scheduler integrates with the existing LINE messaging infrastructure, payment domain, and loan repository to provide timely, accurate payment reminders that improve payment collection rates and client satisfaction.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cron Scheduler                           │
│  (node-cron or Bun.CronJob)                                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─► Billing Job (Daily 9:00 AM)
                 ├─► Warning Job (Daily 9:00 AM)
                 ├─► Due Date Job (Daily 8:00 AM)
                 └─► Overdue Job (Daily 10:00 AM)
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│          Notification Scheduler Domain                      │
│  - Identify loans requiring notifications                   │
│  - Check notification history                               │
│  - Generate Flex Messages                                   │
│  - Send via LINE client                                     │
│  - Record notification history                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─► Loans Repository (Query loans by due date)
                 ├─► Clients Repository (Get client info)
                 ├─► Connect Repository (Get LINE user IDs)
                 ├─► Notification History Repository (Track sent)
                 ├─► Flex Message Templates (Format messages)
                 └─► LINE Messaging Client (Send messages)
```

### Component Interaction Flow

1. **Cron Trigger**: Scheduled job executes at configured time
2. **Loan Identification**: Query loans matching notification criteria
3. **Client Resolution**: Look up client and LINE user ID
4. **Duplicate Check**: Verify notification hasn't been sent
5. **Message Generation**: Create Flex Message with loan data
6. **Message Delivery**: Send via LINE Messaging API
7. **History Recording**: Store notification record

## Components and Interfaces

### 1. Notification Scheduler Domain

**File**: `api/src/features/notifications/notification-scheduler.domain.ts`

**Responsibilities**:
- Orchestrate notification sending workflow
- Identify loans requiring notifications
- Generate notification messages
- Coordinate with repositories and LINE client
- Handle errors gracefully

**Key Methods**:
```typescript
class NotificationSchedulerDomain {
  async sendBillingNotifications(): Promise<NotificationJobResult>
  async sendWarningNotifications(): Promise<NotificationJobResult>
  async sendDueDateNotifications(): Promise<NotificationJobResult>
  async sendOverdueNotifications(): Promise<NotificationJobResult>
  
  private async processLoanNotification(
    loan: LoanWithClient,
    notificationType: NotificationType
  ): Promise<void>
  
  private async getLineUserId(clientId: string): Promise<string | null>
  private async shouldSendNotification(
    loanId: string,
    notificationType: NotificationType,
    billingPeriod: string
  ): Promise<boolean>
}
```

### 2. Notification History Repository

**File**: `api/src/features/notifications/notification-history.repository.ts`

**Responsibilities**:
- Store notification records
- Query notification history
- Prevent duplicate notifications

**Key Methods**:
```typescript
class NotificationHistoryRepository {
  async create(record: NotificationHistoryInsert): Promise<NotificationHistory>
  async findByLoanAndType(
    loanId: string,
    notificationType: NotificationType,
    billingPeriod: string
  ): Promise<NotificationHistory | null>
  async findByLoan(loanId: string): Promise<NotificationHistory[]>
}
```

### 3. Notification Cron Jobs

**File**: `api/src/features/notifications/notification.cron.ts`

**Responsibilities**:
- Initialize and schedule cron jobs
- Execute notification domain methods
- Handle job lifecycle

**Key Functions**:
```typescript
function initializeNotificationJobs(
  schedulerDomain: NotificationSchedulerDomain
): void

function stopNotificationJobs(): void
```

### 4. Notification Service (Flex Message Generation)

**File**: `api/src/features/notifications/notification.service.ts`

**Responsibilities**:
- Generate Flex Messages for each notification type
- Format loan and payment data
- Create payment links

**Key Methods**:
```typescript
class NotificationService {
  createBillingNotification(data: BillingNotificationData): FlexMessage
  createWarningNotification(data: WarningNotificationData): FlexMessage
  createDueDateNotification(data: DueDateNotificationData): FlexMessage
  createOverdueNotification(data: OverdueNotificationData): FlexMessage
  
  private generatePaymentLink(loanId: string): string
}
```

## Data Models

### Notification History Schema

**File**: `api/src/core/database/schema/notification-history.schema.ts`

```typescript
export const notificationTypeEnum = pgEnum("notification_type", [
  "billing",
  "warning",
  "due_date",
  "overdue"
]);

export const notificationHistory = pgTable("notification_history", {
  id: varchar("id", { length: 36 })
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  
  loan_id: varchar("loan_id", { length: 36 })
    .references(() => loans.id)
    .notNull(),
  
  client_id: varchar("client_id", { length: 36 })
    .references(() => clients.id)
    .notNull(),
  
  line_user_id: varchar("line_user_id", { length: 100 }).notNull(),
  
  notification_type: notificationTypeEnum("notification_type").notNull(),
  
  // For billing/warning/due_date: YYYY-MM format
  // For overdue: YYYY-MM-DD format with overdue_days
  billing_period: varchar("billing_period", { length: 20 }).notNull(),
  
  // For overdue notifications: 1, 3, 7
  overdue_days: integer("overdue_days"),
  
  sent_at: timestamp("sent_at").defaultNow().notNull(),
  
  // Store message content for audit
  message_data: varchar("message_data", { length: 5000 }),
  
  // Success/failure tracking
  send_status: varchar("send_status", { length: 20 }).notNull(), // 'sent', 'failed'
  error_message: varchar("error_message", { length: 500 }),
  
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Indexes for efficient querying
// CREATE INDEX idx_notification_history_loan_type_period 
//   ON notification_history(loan_id, notification_type, billing_period);
// CREATE INDEX idx_notification_history_sent_at 
//   ON notification_history(sent_at);
```

### Type Definitions

**File**: `api/src/features/notifications/notification.types.ts`

```typescript
export type NotificationType = 'billing' | 'warning' | 'due_date' | 'overdue';

export interface NotificationHistoryInsert {
  loan_id: string;
  client_id: string;
  line_user_id: string;
  notification_type: NotificationType;
  billing_period: string;
  overdue_days?: number;
  message_data?: string;
  send_status: 'sent' | 'failed';
  error_message?: string;
}

export interface NotificationHistory extends NotificationHistoryInsert {
  id: string;
  sent_at: Date;
  created_at: Date;
}

export interface NotificationJobResult {
  jobName: string;
  startTime: Date;
  endTime: Date;
  loansProcessed: number;
  notificationsSent: number;
  notificationsFailed: number;
  errors: Array<{
    loanId: string;
    error: string;
  }>;
}

export interface LoanWithClient {
  id: string;
  contract_number: string;
  client_id: string;
  outstanding_balance: string;
  installment_amount: string;
  due_day: number;
  contract_status: 'Active' | 'Closed' | 'Overdue';
  overdue_days: number;
  interest_rate: string;
  term_months: number;
  contract_start_date: string;
  total_penalties: string;
  client_name: string;
  client_phone: string;
}

export interface BillingNotificationData {
  month: string;
  amount: number;
  dueDate: string;
  contractNumber: string;
  paymentLink: string;
}

export interface WarningNotificationData {
  daysRemaining: number;
  amount: number;
  dueDate: string;
  contractNumber: string;
  paymentLink: string;
}

export interface DueDateNotificationData {
  amount: number;
  contractNumber: string;
  paymentLink: string;
}

export interface OverdueNotificationData {
  daysOverdue: number;
  amount: number;
  contractNumber: string;
  penaltyAmount?: number;
  paymentLink: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated:

- Properties 1.1, 2.1, and 3.1 all test date filtering but for different intervals - these should remain separate as they test distinct business rules
- Properties 1.5, 2.5, 3.5, and 4.5 all test history recording - can be combined into one comprehensive property
- Properties 1.3, 2.3, 3.3, and 6.3 all test duplicate prevention - can be combined into one property
- Properties 1.4, 2.4, 3.4, and 4.4 all test template usage - can be combined into one property that validates correct template selection
- Property 6.5 and 9.5 are duplicates - keep only one
- Logging properties (10.1-10.5) are examples of expected behavior, not universal properties

### Correctness Properties

Property 1: Billing notification date filtering
*For any* set of loan contracts, when identifying loans for billing notifications, only loans with due dates exactly 15 days in the future and status Active or Overdue should be selected
**Validates: Requirements 1.1, 1.2**

Property 2: Warning notification date filtering
*For any* set of loan contracts, when identifying loans for warning notifications, only loans with due dates exactly 3 days in the future, status Active or Overdue, and outstanding balance greater than zero should be selected
**Validates: Requirements 2.1, 2.2**

Property 3: Due date notification filtering
*For any* set of loan contracts, when identifying loans for due date notifications, only loans with due dates matching the current date, status Active or Overdue, and outstanding balance greater than zero should be selected
**Validates: Requirements 3.1, 3.2**

Property 4: Overdue notification identification
*For any* set of loan contracts, when identifying loans for overdue notifications, only loans with due dates in the past, status Overdue, and days overdue equal to 1, 3, or 7 should be selected
**Validates: Requirements 4.1, 4.2, 4.3**

Property 5: Duplicate notification prevention
*For any* loan and notification type, if a notification has already been sent for the current billing period (or overdue milestone), then no additional notification of that type should be sent for that period
**Validates: Requirements 1.3, 2.3, 3.3, 4.3, 6.1, 6.2, 6.3**

Property 6: Notification history recording
*For any* successfully sent notification, a record containing loan ID, client ID, LINE user ID, notification type, billing period, and timestamp should be created in the notification history table
**Validates: Requirements 1.5, 2.5, 3.5, 4.5, 6.4**

Property 7: Failed notification history exclusion
*For any* notification that fails to send, no record should be created in the notification history table
**Validates: Requirements 6.5, 9.5**

Property 8: Correct template selection
*For any* notification type (billing, warning, due_date, overdue), the corresponding Flex Message template function (createBillingMessage, createDueWarningMessage, createDueDateMessage, createOverdueMessage) should be used
**Validates: Requirements 1.4, 2.4, 3.4, 4.4**

Property 9: LINE user ID resolution
*For any* client with an active LINE connection, the most recent active LINE user ID should be retrieved from the connect codes table
**Validates: Requirements 5.1, 5.2, 5.4**

Property 10: Missing LINE connection handling
*For any* client without an active LINE connection, the notification should be skipped and a warning should be logged
**Validates: Requirements 5.3, 5.5**

Property 11: Payment link inclusion
*For any* notification message, a payment link containing the LIFF URL with the loan contract ID as a parameter should be included
**Validates: Requirements 8.1, 8.2**

Property 12: Payment link encoding
*For any* payment link, the URL should be properly encoded and valid according to URL standards
**Validates: Requirements 8.5**

Property 13: Payment link fallback
*For any* notification when LIFF URL is not configured, a fallback URL should be used or the payment link should be omitted
**Validates: Requirements 8.4**

Property 14: Error isolation
*For any* batch of notifications, if one notification fails, the remaining notifications in the batch should still be processed
**Validates: Requirements 9.1, 9.2**

Property 15: Fresh loan data retrieval
*For any* notification, the loan contract data used should be the most current data from the database at the time of notification generation
**Validates: Requirements 11.1**

Property 16: Accrued interest calculation
*For any* notification displaying payment amounts, accrued interest should be calculated from the last payment date to the current date using the loan's interest rate
**Validates: Requirements 11.2**

Property 17: Balance calculation accuracy
*For any* notification displaying remaining balance, the amount should equal the sum of outstanding principal and accrued interest
**Validates: Requirements 11.3**

Property 18: Penalty calculation
*For any* overdue notification, penalty amounts should be calculated based on the loan contract's penalty terms and days overdue
**Validates: Requirements 11.4**

Property 19: Currency formatting
*For any* monetary amount in a notification, the value should be formatted with Thai Baht symbol and thousand separators (e.g., ฿1,234.56)
**Validates: Requirements 11.5**

Property 20: Timezone consistency
*For any* date comparison for notification eligibility, all timestamps should be converted to Asia/Bangkok timezone before comparison
**Validates: Requirements 12.2, 12.3**

Property 21: Timestamp storage format
*For any* notification history record, timestamps should be stored in UTC format in the database
**Validates: Requirements 12.4**

## Error Handling

### Error Categories

1. **Database Errors**
   - Connection failures
   - Query timeouts
   - Transaction rollbacks
   - **Handling**: Log error, skip current notification, continue with next

2. **LINE API Errors**
   - Authentication failures
   - Rate limiting
   - Network timeouts
   - Invalid user IDs
   - **Handling**: Log error with LINE user ID, mark as failed, continue with next

3. **Data Validation Errors**
   - Missing required fields
   - Invalid loan data
   - Missing LINE connections
   - **Handling**: Log warning, skip notification, continue with next

4. **Configuration Errors**
   - Missing LIFF URL
   - Invalid cron schedule
   - **Handling**: Use fallback values, log warning

### Error Recovery Strategy

- **Individual Notification Failures**: Log and continue processing remaining notifications
- **Batch Processing**: Never fail entire job due to single notification failure
- **Retry Logic**: Failed notifications will be retried on next scheduled run (no immediate retry)
- **Circuit Breaker**: If LINE API fails consistently, log critical error but continue attempting

### Logging Strategy

All errors should be logged with structured data:
```typescript
logger.error({
  event: "notification_send_failed",
  notificationType: "billing",
  loanId: "...",
  clientId: "...",
  lineUserId: "...",
  error: error.message,
  stack: error.stack
}, "Failed to send notification");
```

## Testing Strategy

### Unit Testing

Unit tests will verify:
- Date filtering logic for each notification type
- Duplicate detection logic
- LINE user ID resolution
- Payment link generation
- Currency formatting
- Timezone conversions
- Error handling for individual failures

### Property-Based Testing

Property-based tests will use **fast-check** library to verify:
- Date filtering properties across random loan datasets
- Duplicate prevention across random notification histories
- Template selection for all notification types
- Balance and interest calculations with random loan data
- Error isolation with randomly injected failures
- Timezone handling with random dates

Each property test should run a minimum of 100 iterations.

### Integration Testing

Integration tests will verify:
- End-to-end notification flow with test database
- LINE API integration with mock LINE client
- Cron job execution (manual trigger in tests)
- Database transaction handling

### Test Data Generation

Use fast-check generators for:
- Random loan contracts with various due dates
- Random notification histories
- Random client and LINE connection data
- Random dates and timezones

## Performance Considerations

### Batch Processing

- Process notifications in batches of 50 to avoid memory issues
- Use database pagination for large loan datasets
- Implement connection pooling for database queries

### Rate Limiting

- LINE Messaging API has rate limits (check LINE documentation)
- Implement delay between messages if needed (e.g., 100ms)
- Monitor API response headers for rate limit warnings

### Database Optimization

- Create indexes on:
  - `loans.due_day` for date filtering
  - `loans.contract_status` for status filtering
  - `notification_history(loan_id, notification_type, billing_period)` for duplicate checking
- Use database connection pooling
- Optimize queries to fetch only required fields

### Monitoring

- Track notification job execution time
- Monitor notification success/failure rates
- Alert on high failure rates (>10%)
- Track LINE API response times

## Deployment Considerations

### Environment Configuration

Required environment variables:
```
LINE_CHANNEL_ACCESS_TOKEN=<token>
LINE_LIFF_URL=<liff_url>
NOTIFICATION_TIMEZONE=Asia/Bangkok
NOTIFICATION_ENABLED=true
```

### Cron Schedule Configuration

Cron expressions (using node-cron syntax):
- Billing: `0 9 * * *` (9:00 AM daily)
- Warning: `0 9 * * *` (9:00 AM daily)
- Due Date: `0 8 * * *` (8:00 AM daily)
- Overdue: `0 10 * * *` (10:00 AM daily)

### Database Migration

Migration file needed for `notification_history` table:
```sql
CREATE TYPE notification_type AS ENUM ('billing', 'warning', 'due_date', 'overdue');

CREATE TABLE notification_history (
  id VARCHAR(36) PRIMARY KEY,
  loan_id VARCHAR(36) NOT NULL REFERENCES loans(id),
  client_id VARCHAR(36) NOT NULL REFERENCES clients(id),
  line_user_id VARCHAR(100) NOT NULL,
  notification_type notification_type NOT NULL,
  billing_period VARCHAR(20) NOT NULL,
  overdue_days INTEGER,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  message_data VARCHAR(5000),
  send_status VARCHAR(20) NOT NULL,
  error_message VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_history_loan_type_period 
  ON notification_history(loan_id, notification_type, billing_period);
  
CREATE INDEX idx_notification_history_sent_at 
  ON notification_history(sent_at);
```

### Graceful Shutdown

- Implement signal handlers (SIGTERM, SIGINT)
- Allow current notification batch to complete
- Stop accepting new cron triggers
- Close database connections

## Dependencies

### External Libraries

- **Cron Scheduling**: Use Bun's built-in `Bun.CronJob` or `node-cron` package
- **Date Handling**: `dayjs` with timezone plugin
- **Property Testing**: `fast-check` (already in devDependencies)

### Internal Dependencies

- LINE Messaging Client (`api/src/features/line/line.client.ts`)
- Flex Message Templates (`api/src/features/line/utils/flex-message.templates.ts`)
- Loans Repository (`api/src/features/loans/loans.repository.ts`)
- Clients Repository (`api/src/features/clients/clients.repository.ts`)
- Connect Repository (`api/src/features/connect/connect.repository.ts`)
- Logger (`api/src/core/logger`)
- Database (`api/src/core/database`)

## Security Considerations

- **LINE Access Token**: Store securely in environment variables, never commit to code
- **Rate Limiting**: Respect LINE API rate limits to avoid account suspension
- **Data Privacy**: Log only necessary information, avoid logging sensitive client data
- **Error Messages**: Don't expose internal system details in error messages sent to clients

## Future Enhancements

1. **Configurable Schedules**: Allow administrators to configure notification timing via admin panel
2. **Notification Preferences**: Allow clients to opt-in/opt-out of specific notification types
3. **Custom Messages**: Support custom message templates per client or loan type
4. **Multi-Channel**: Support SMS or email notifications in addition to LINE
5. **Analytics Dashboard**: Track notification effectiveness and payment conversion rates
6. **A/B Testing**: Test different message templates to optimize payment rates
