# Payment Notification Scheduler

## Overview

The Payment Notification Scheduler is an automated system that proactively sends payment reminders to clients via LINE messaging at strategic intervals before and after payment due dates. The system uses cron-based scheduling to run periodic jobs that identify loans requiring notifications, generate rich Flex Messages, and maintain notification history to prevent duplicates.

> **Quick Start**: New to the notification scheduler? See the [Quick Start Guide](./NOTIFICATION_QUICK_START.md) for a 5-minute setup.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Cron Scheduler                           │
│  (Bun.CronJob)                                             │
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
                 ├─► Notification Service (Format messages)
                 └─► LINE Messaging Client (Send messages)
```

### Key Files

| File | Purpose |
|------|---------|
| `notification-scheduler.domain.ts` | Core business logic and orchestration |
| `notification-history.repository.ts` | Database operations for notification tracking |
| `notification.service.ts` | Flex Message generation |
| `notification.cron.ts` | Cron job initialization and scheduling |
| `notification.types.ts` | TypeScript type definitions |
| `notification.utils.ts` | Utility functions (calculations, formatting) |
| `notification-logging.utils.ts` | Structured logging helpers |

## Notification Types

### 1. Billing Notification (15 Days Before Due Date)

**Trigger**: Sent 15 days before payment due date  
**Purpose**: Give clients advance notice to prepare payment  
**Schedule**: Daily at 9:00 AM Asia/Bangkok  

**Eligibility Criteria**:
- Due date is exactly 15 days in the future
- Loan status is Active or Overdue
- No billing notification sent for current billing period

**Message Template**: `createBillingMessage`

### 2. Warning Notification (3 Days Before Due Date)

**Trigger**: Sent 3 days before payment due date  
**Purpose**: Urgent reminder that payment is due soon  
**Schedule**: Daily at 9:00 AM Asia/Bangkok  

**Eligibility Criteria**:
- Due date is exactly 3 days in the future
- Loan status is Active or Overdue
- Outstanding balance > 0
- No warning notification sent for current billing period

**Message Template**: `createDueWarningMessage`

### 3. Due Date Notification (On Due Date)

**Trigger**: Sent on the payment due date  
**Purpose**: Critical reminder that payment is due today  
**Schedule**: Daily at 8:00 AM Asia/Bangkok  

**Eligibility Criteria**:
- Due date matches current date
- Loan status is Active or Overdue
- Outstanding balance > 0
- No due date notification sent for current date

**Message Template**: `createDueDateMessage`

### 4. Overdue Notification (After Due Date)

**Trigger**: Sent 1, 3, and 7 days after due date  
**Purpose**: Notify clients of late payment and penalties  
**Schedule**: Daily at 10:00 AM Asia/Bangkok  

**Eligibility Criteria**:
- Due date is in the past
- Loan status is Overdue
- Days overdue equals 1, 3, or 7
- No overdue notification sent for specific milestone

**Message Template**: `createOverdueMessage`

## Cron Job Schedules

All times are in **Asia/Bangkok** timezone.

| Job | Schedule | Cron Expression | Description |
|-----|----------|-----------------|-------------|
| Billing | Daily 9:00 AM | `0 9 * * *` | 15-day advance notice |
| Warning | Daily 9:00 AM | `0 9 * * *` | 3-day urgent reminder |
| Due Date | Daily 8:00 AM | `0 8 * * *` | Same-day critical reminder |
| Overdue | Daily 10:00 AM | `0 10 * * *` | Post-due date penalties |

### Cron Expression Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6)
│ │ │ │ │
* * * * *
```

## Notification Workflow

### Processing Flow

1. **Cron Trigger**: Job executes at scheduled time
2. **Loan Identification**: Query database for eligible loans
3. **Client Resolution**: Look up client information
4. **LINE User ID Lookup**: Get active LINE connection
5. **Duplicate Check**: Verify notification hasn't been sent
6. **Message Generation**: Create Flex Message with loan data
7. **Message Delivery**: Send via LINE Messaging API
8. **History Recording**: Store notification record
9. **Error Handling**: Log failures, continue with next loan

### Duplicate Prevention

The system prevents duplicate notifications by checking the `notification_history` table before sending:

```typescript
// Check if notification already sent
const existing = await notificationHistoryRepository.findByLoanAndType(
  loan.id,
  notificationType,
  billingPeriod
);

if (existing) {
  logger.info({ loanId: loan.id }, "Notification already sent, skipping");
  return;
}
```

**Billing Period Format**:
- Billing/Warning/Due Date: `YYYY-MM` (e.g., "2025-01")
- Overdue: `YYYY-MM-DD` with `overdue_days` field (e.g., "2025-01-15" with days=3)

## Database Schema

### notification_history Table

See [NOTIFICATION_MIGRATION.md](./NOTIFICATION_MIGRATION.md) for complete schema details.

**Key Fields**:
- `loan_id`: Which loan the notification is for
- `notification_type`: billing, warning, due_date, or overdue
- `billing_period`: YYYY-MM or YYYY-MM-DD format
- `overdue_days`: 1, 3, or 7 for overdue notifications
- `send_status`: 'sent' or 'failed'
- `sent_at`: Timestamp of notification delivery

**Indexes**:
- `idx_notification_history_loan_type_period`: For duplicate checking
- `idx_notification_history_sent_at`: For time-based queries

## Environment Variables

### Required Configuration

```bash
# LINE Messaging API
LINE_CHANNEL_ACCESS_TOKEN=<your_channel_access_token>
LINE_CHANNEL_SECRET=<your_channel_secret>

# LINE LIFF (for payment links)
LINE_LIFF_URL=https://liff.line.me/<your_liff_id>

# Notification Settings
NOTIFICATION_ENABLED=true
NOTIFICATION_TIMEZONE=Asia/Bangkok

# Database
DATABASE_URL=postgresql://user:password@host:port/database
```

### Optional Configuration

```bash
# Logging
LOG_LEVEL=info

# Notification Timing (if customization needed)
# Note: Requires code changes to cron schedules
```

### Configuration Validation

The application validates required configuration on startup:

```typescript
if (!config.line.channelAccessToken) {
  throw new Error("LINE_CHANNEL_ACCESS_TOKEN is required");
}

if (!config.line.liffUrl) {
  logger.warn("LINE_LIFF_URL not configured, payment links will be omitted");
}
```

## Notification Content

### Data Calculations

#### Accrued Interest

```typescript
function calculateAccruedInterest(
  principal: number,
  annualRate: number,
  startDate: Date,
  endDate: Date
): number {
  const days = dayjs(endDate).diff(dayjs(startDate), 'day');
  return (principal * annualRate * days) / 36500; // 365 days, percentage
}
```

#### Total Balance

```typescript
function calculateTotalBalance(
  principal: number,
  accruedInterest: number
): number {
  return principal + accruedInterest;
}
```

#### Penalty Calculation

```typescript
function calculatePenalty(
  overdueAmount: number,
  daysOverdue: number,
  penaltyRate: number
): number {
  return (overdueAmount * penaltyRate * daysOverdue) / 36500;
}
```

### Currency Formatting

All monetary amounts are formatted in Thai Baht:

```typescript
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
// Example: ฿1,234.56
```

### Payment Links

Payment links are generated using the LINE LIFF URL:

```typescript
function generatePaymentLink(loanId: string): string {
  const liffUrl = config.line.liffUrl;
  if (!liffUrl) {
    return '#'; // Fallback if not configured
  }
  return `${liffUrl}?loanId=${encodeURIComponent(loanId)}`;
}
```

## Logging and Monitoring

### Structured Logging

All operations use structured logging with Pino:

```typescript
logger.info({
  event: "notification_job_started",
  jobName: "billing_notifications",
  startTime: new Date().toISOString(),
}, "Starting billing notification job");
```

### Key Log Events

| Event | Level | Description |
|-------|-------|-------------|
| `notification_job_started` | info | Job execution begins |
| `loans_identified` | info | Loans found for notification |
| `notification_sent` | info | Successful message delivery |
| `notification_skipped` | info | Duplicate or no LINE connection |
| `notification_failed` | error | Message delivery failed |
| `notification_job_completed` | info | Job execution finished |

### Job Result Metrics

Each job logs comprehensive results:

```typescript
{
  event: "notification_job_completed",
  jobName: "billing_notifications",
  startTime: "2025-01-15T09:00:00Z",
  endTime: "2025-01-15T09:02:30Z",
  duration: 150000, // milliseconds
  loansProcessed: 45,
  notificationsSent: 42,
  notificationsFailed: 3,
  errors: [
    { loanId: "abc123", error: "LINE user not found" }
  ]
}
```

## Error Handling

### Error Categories

#### 1. Database Errors
- **Cause**: Connection failures, query timeouts
- **Handling**: Log error, skip current notification, continue with next
- **Recovery**: Retry on next scheduled run

#### 2. LINE API Errors
- **Cause**: Authentication failures, rate limiting, network timeouts
- **Handling**: Log error with LINE user ID, mark as failed, continue
- **Recovery**: Retry on next scheduled run

#### 3. Data Validation Errors
- **Cause**: Missing required fields, invalid loan data
- **Handling**: Log warning, skip notification, continue
- **Recovery**: Fix data issues, will retry on next run

#### 4. Missing LINE Connection
- **Cause**: Client not connected to LINE
- **Handling**: Log warning, skip notification
- **Recovery**: Client must connect via LIFF app

### Error Isolation

The system ensures one failure doesn't stop all notifications:

```typescript
for (const loan of loans) {
  try {
    await processLoanNotification(loan, notificationType);
  } catch (error) {
    logger.error({
      event: "notification_processing_error",
      loanId: loan.id,
      error: error.message,
    }, "Failed to process loan notification");
    // Continue with next loan
  }
}
```

### Failed Notification Handling

Failed notifications are **not** recorded in history, allowing retry:

```typescript
// Only record successful sends
if (sendResult.success) {
  await notificationHistoryRepository.create({
    loan_id: loan.id,
    // ... other fields
    send_status: 'sent',
  });
}
```

## Troubleshooting

### Common Issues

#### Issue: Notifications Not Sending

**Symptoms**: No notifications being sent, no errors in logs

**Possible Causes**:
1. `NOTIFICATION_ENABLED` is false or not set
2. No loans match eligibility criteria
3. All eligible loans already have notifications sent

**Diagnosis**:
```bash
# Check environment variable
echo $NOTIFICATION_ENABLED

# Check for eligible loans
bun run api/script/test-notification-queries.ts

# Check notification history
psql $DATABASE_URL -c "SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT 10;"
```

**Resolution**:
- Set `NOTIFICATION_ENABLED=true` in `.env`
- Verify loan due dates and statuses
- Check if notifications already sent for current period

#### Issue: LINE API Errors

**Symptoms**: Errors like "Invalid user ID" or "Authentication failed"

**Possible Causes**:
1. Invalid `LINE_CHANNEL_ACCESS_TOKEN`
2. Client LINE connection expired
3. LINE API rate limiting

**Diagnosis**:
```typescript
// Check logs for LINE API errors
grep "line_api_error" logs/app.log

// Verify LINE connection
SELECT * FROM connect_codes 
WHERE client_id = '<client_id>' 
AND status = 'active';
```

**Resolution**:
- Verify LINE channel access token is correct and not expired
- Ask client to reconnect via LIFF app
- Implement rate limiting delays if hitting API limits

#### Issue: Duplicate Notifications

**Symptoms**: Clients receiving multiple notifications for same period

**Possible Causes**:
1. Duplicate check not working
2. Multiple application instances running
3. Database transaction issues

**Diagnosis**:
```sql
-- Check for duplicate records
SELECT loan_id, notification_type, billing_period, COUNT(*) 
FROM notification_history 
GROUP BY loan_id, notification_type, billing_period 
HAVING COUNT(*) > 1;
```

**Resolution**:
- Verify index exists: `idx_notification_history_loan_type_period`
- Ensure only one application instance is running cron jobs
- Check database transaction isolation level

#### Issue: Incorrect Notification Timing

**Symptoms**: Notifications sent at wrong times or dates

**Possible Causes**:
1. Server timezone mismatch
2. Cron schedule incorrect
3. Date calculation errors

**Diagnosis**:
```bash
# Check server timezone
date
timedatectl

# Check cron schedule in code
grep "CronJob" api/src/features/notifications/notification.cron.ts
```

**Resolution**:
- Verify `NOTIFICATION_TIMEZONE=Asia/Bangkok` is set
- Ensure server uses UTC and application converts to local timezone
- Review date calculation logic in `notification.utils.ts`

#### Issue: Missing Payment Links

**Symptoms**: Notifications don't include payment links

**Possible Causes**:
1. `LINE_LIFF_URL` not configured
2. LIFF URL format incorrect

**Diagnosis**:
```bash
# Check environment variable
echo $LINE_LIFF_URL

# Should be: https://liff.line.me/<liff_id>
```

**Resolution**:
- Set `LINE_LIFF_URL` in `.env`
- Verify LIFF app is configured in LINE Developers Console
- Test LIFF URL manually in browser

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Set log level to debug
LOG_LEVEL=debug bun run dev
```

This will log additional details about:
- Loan query results
- Duplicate check logic
- LINE API requests/responses
- Message generation data

### Manual Testing

Test notification jobs manually:

```typescript
// In api/script/test-notification-queries.ts
import { notificationSchedulerDomain } from '../src/features/notifications/notification-scheduler.domain';

// Test billing notifications
const result = await notificationSchedulerDomain.sendBillingNotifications();
console.log(result);
```

### Health Checks

Monitor notification system health:

```sql
-- Check recent notification activity
SELECT 
  notification_type,
  DATE(sent_at) as date,
  COUNT(*) as count,
  SUM(CASE WHEN send_status = 'sent' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN send_status = 'failed' THEN 1 ELSE 0 END) as failed
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY notification_type, DATE(sent_at)
ORDER BY date DESC, notification_type;
```

## Testing

### Unit Tests

Test individual components:

```bash
# Test notification service
bun test api/src/features/notifications/notification.service.test.ts

# Test utility functions
bun test api/src/features/notifications/notification.utils.test.ts
```

### Property-Based Tests

Test correctness properties:

```bash
# Test duplicate prevention
bun test api/src/features/notifications/notification-history.repository.property.test.ts
```

### Integration Tests

Test end-to-end flow:

```bash
# Test full notification workflow
bun test api/src/features/notifications/notification-scheduler.integration.test.ts
```

### Manual Testing

```bash
# Test database schema
bun run api/script/verify-notification-schema.ts

# Test notification queries
bun run api/script/test-notification-queries.ts

# Test notification table operations
bun run api/script/test-notification-table.ts
```

## Performance Considerations

### Batch Processing

- Process notifications in batches to avoid memory issues
- Use database pagination for large loan datasets
- Implement connection pooling for database queries

### Rate Limiting

- LINE Messaging API has rate limits (check LINE documentation)
- Implement delays between messages if needed (e.g., 100ms)
- Monitor API response headers for rate limit warnings

### Database Optimization

Indexes are created for optimal query performance:

```sql
-- For duplicate checking (most frequent query)
CREATE INDEX idx_notification_history_loan_type_period 
  ON notification_history(loan_id, notification_type, billing_period);

-- For time-based queries and reporting
CREATE INDEX idx_notification_history_sent_at 
  ON notification_history(sent_at);
```

### Monitoring Metrics

Track these metrics for performance monitoring:

- Job execution time (should be < 5 minutes for typical load)
- Notifications per second (should stay under LINE API limits)
- Database query time (should be < 100ms per query)
- Success rate (should be > 95%)

## Security Considerations

### Access Token Security

- Store `LINE_CHANNEL_ACCESS_TOKEN` in environment variables only
- Never commit tokens to version control
- Rotate tokens periodically
- Use different tokens for development and production

### Data Privacy

- Log only necessary information for debugging
- Avoid logging sensitive client data (phone numbers, addresses)
- Mask LINE user IDs in logs if required by privacy policy
- Implement log retention policies

### Rate Limiting

- Respect LINE API rate limits to avoid account suspension
- Implement exponential backoff for retries
- Monitor for unusual activity patterns

## Deployment

### Initial Setup

1. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your LINE credentials
   ```

2. **Run Database Migration**:
   ```bash
   bun run db:migrate
   ```

3. **Verify Migration**:
   ```bash
   bun run api/script/verify-notification-migration.ts
   ```

4. **Start Application**:
   ```bash
   bun run dev  # Development
   bun run start  # Production
   ```

### Graceful Shutdown

The application handles shutdown signals properly:

```typescript
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, stopping notification jobs');
  stopNotificationJobs();
  // Allow current batch to complete
  await new Promise(resolve => setTimeout(resolve, 5000));
  process.exit(0);
});
```

### Monitoring in Production

1. **Set up log aggregation** (e.g., CloudWatch, Datadog)
2. **Create alerts** for high failure rates (> 10%)
3. **Monitor job execution times** for performance degradation
4. **Track notification delivery rates** for business metrics

## Related Documentation

- [Quick Start Guide](./NOTIFICATION_QUICK_START.md) - 5-minute setup guide for new users
- [Database Schema](./DATABASE_SCHEMA.md) - Complete database schema documentation
- [Notification Migration](./NOTIFICATION_MIGRATION.md) - Migration details and verification
- [Logging and Errors](./LOGGING_AND_ERRORS.md) - Logging standards and error handling

## Requirements Traceability

This implementation satisfies all requirements from the Payment Notification Scheduler specification:

- **Requirements 1.1-1.5**: Billing notification scheduling
- **Requirements 2.1-2.5**: Warning notification scheduling
- **Requirements 3.1-3.5**: Due date notification scheduling
- **Requirements 4.1-4.5**: Overdue notification scheduling
- **Requirements 5.1-5.5**: Client and LINE user ID resolution
- **Requirements 6.1-6.5**: Notification history and duplicate prevention
- **Requirements 7.1-7.5**: Cron job configuration and scheduling
- **Requirements 8.1-8.5**: Payment link generation
- **Requirements 9.1-9.5**: Error handling and resilience
- **Requirements 10.1-10.5**: Logging and monitoring
- **Requirements 11.1-11.5**: Notification content accuracy
- **Requirements 12.1-12.5**: Timezone handling

## Support

For issues or questions:

1. Check this documentation first
2. Review logs for error details
3. Run diagnostic scripts in `api/script/`
4. Check notification history in database
5. Verify LINE API status and credentials
