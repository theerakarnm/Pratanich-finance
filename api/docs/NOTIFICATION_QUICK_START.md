# Notification Scheduler Quick Start Guide

## 5-Minute Setup

### 1. Configure Environment Variables

Add to your `.env` file:

```bash
# LINE Messaging API (Required)
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# LINE LIFF for payment links (Required)
LINE_LIFF_URL=https://liff.line.me/your-liff-id

# Notification Settings (Optional)
NOTIFICATION_ENABLED=true
NOTIFICATION_TIMEZONE=Asia/Bangkok
```

### 2. Run Database Migration

```bash
bun run db:migrate
```

### 3. Verify Setup

```bash
# Verify database schema
bun run api/script/verify-notification-schema.ts

# Test notification queries
bun run api/script/test-notification-queries.ts
```

### 4. Start Application

```bash
# Development
bun run dev

# Production
bun run start
```

The notification scheduler will automatically start and run according to the configured schedules.

## Notification Schedule

| Type | Timing | Schedule |
|------|--------|----------|
| Billing | 15 days before due date | Daily 9:00 AM |
| Warning | 3 days before due date | Daily 9:00 AM |
| Due Date | On due date | Daily 8:00 AM |
| Overdue | 1, 3, 7 days after due date | Daily 10:00 AM |

All times are in **Asia/Bangkok** timezone.

## Verify It's Working

### Check Logs

```bash
# Look for notification job logs
tail -f logs/app.log | grep notification_job
```

Expected log output:
```json
{
  "event": "notification_job_started",
  "jobName": "billing_notifications",
  "startTime": "2025-01-15T09:00:00Z"
}
```

### Check Database

```sql
-- View recent notifications
SELECT 
  notification_type,
  COUNT(*) as count,
  MAX(sent_at) as last_sent
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '24 hours'
GROUP BY notification_type;
```

### Manual Test

Run a notification job manually:

```typescript
// In api/script/test-notification-queries.ts
import { notificationSchedulerDomain } from '../src/features/notifications/notification-scheduler.domain';

const result = await notificationSchedulerDomain.sendBillingNotifications();
console.log(result);
```

## Common Commands

```bash
# View notification history
psql $DATABASE_URL -c "SELECT * FROM notification_history ORDER BY sent_at DESC LIMIT 10;"

# Count notifications by type
psql $DATABASE_URL -c "SELECT notification_type, COUNT(*) FROM notification_history GROUP BY notification_type;"

# Check for failed notifications
psql $DATABASE_URL -c "SELECT * FROM notification_history WHERE send_status = 'failed';"

# Test database connection
bun run api/script/test-database-connection.ts

# Run all tests
bun test
```

## Troubleshooting

### No Notifications Sending?

1. **Check if enabled**:
   ```bash
   echo $NOTIFICATION_ENABLED  # Should be "true"
   ```

2. **Check for eligible loans**:
   ```bash
   bun run api/script/test-notification-queries.ts
   ```

3. **Check LINE credentials**:
   ```bash
   echo $LINE_CHANNEL_ACCESS_TOKEN  # Should not be empty
   ```

### LINE API Errors?

1. **Verify token is valid** in LINE Developers Console
2. **Check client LINE connection**:
   ```sql
   SELECT * FROM connect_codes WHERE status = 'active';
   ```
3. **Review error logs**:
   ```bash
   grep "line_api_error" logs/app.log
   ```

### Duplicate Notifications?

1. **Check for duplicate records**:
   ```sql
   SELECT loan_id, notification_type, billing_period, COUNT(*) 
   FROM notification_history 
   GROUP BY loan_id, notification_type, billing_period 
   HAVING COUNT(*) > 1;
   ```

2. **Verify index exists**:
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'notification_history';
   ```

## Next Steps

- Read the [full documentation](./NOTIFICATION_SCHEDULER.md) for detailed information
- Review [notification migration details](./NOTIFICATION_MIGRATION.md)
- Check [database schema](./DATABASE_SCHEMA.md) for complete schema reference
- Set up monitoring and alerts for production

## Support Checklist

Before asking for help, verify:

- [ ] Environment variables are set correctly
- [ ] Database migration has been run
- [ ] LINE credentials are valid
- [ ] At least one loan has a due date in the notification window
- [ ] Client has an active LINE connection
- [ ] Application logs show job execution
- [ ] No errors in application logs

## Key Files Reference

| File | Purpose |
|------|---------|
| `notification-scheduler.domain.ts` | Core business logic |
| `notification.cron.ts` | Cron job schedules |
| `notification.service.ts` | Message generation |
| `notification-history.repository.ts` | Database operations |
| `notification.types.ts` | Type definitions |

## Production Checklist

Before deploying to production:

- [ ] Set `NOTIFICATION_ENABLED=true`
- [ ] Configure production LINE credentials
- [ ] Set correct `LINE_LIFF_URL` for production
- [ ] Run database migration
- [ ] Verify timezone is `Asia/Bangkok`
- [ ] Set up log aggregation
- [ ] Configure alerts for high failure rates
- [ ] Test with a small set of loans first
- [ ] Monitor first 24 hours closely

## Monitoring Queries

```sql
-- Daily notification summary
SELECT 
  DATE(sent_at) as date,
  notification_type,
  COUNT(*) as total,
  SUM(CASE WHEN send_status = 'sent' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN send_status = 'failed' THEN 1 ELSE 0 END) as failed
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at), notification_type
ORDER BY date DESC, notification_type;

-- Success rate by notification type
SELECT 
  notification_type,
  COUNT(*) as total,
  ROUND(100.0 * SUM(CASE WHEN send_status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM notification_history
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY notification_type;

-- Recent failures
SELECT 
  loan_id,
  notification_type,
  error_message,
  sent_at
FROM notification_history
WHERE send_status = 'failed'
  AND sent_at >= NOW() - INTERVAL '24 hours'
ORDER BY sent_at DESC;
```
