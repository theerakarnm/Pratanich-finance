# Notification History Migration

## Overview

This document describes the database migration for the `notification_history` table, which is used by the Payment Notification Scheduler to track sent notifications and prevent duplicates.

## Migration Details

**Migration File**: `api/drizzle/0004_talented_namora.sql`

**Generated**: December 5, 2025

**Status**: ✅ Applied and Verified

## Database Objects Created

### 1. Enum Type: `notification_type`

```sql
CREATE TYPE "public"."notification_type" AS ENUM(
  'billing',
  'warning', 
  'due_date',
  'overdue'
);
```

### 2. Table: `notification_history`

```sql
CREATE TABLE "notification_history" (
  "id" varchar(36) PRIMARY KEY NOT NULL,
  "loan_id" varchar(36) NOT NULL,
  "client_id" varchar(36) NOT NULL,
  "line_user_id" varchar(100) NOT NULL,
  "notification_type" "notification_type" NOT NULL,
  "billing_period" varchar(20) NOT NULL,
  "overdue_days" integer,
  "sent_at" timestamp DEFAULT now() NOT NULL,
  "message_data" varchar(5000),
  "send_status" varchar(20) NOT NULL,
  "error_message" varchar(500),
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

#### Column Descriptions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | varchar(36) | NO | Primary key (UUIDv7) |
| `loan_id` | varchar(36) | NO | Foreign key to loans table |
| `client_id` | varchar(36) | NO | Foreign key to clients table |
| `line_user_id` | varchar(100) | NO | LINE user ID for message delivery |
| `notification_type` | enum | NO | Type of notification (billing, warning, due_date, overdue) |
| `billing_period` | varchar(20) | NO | YYYY-MM format for billing/warning/due_date, YYYY-MM-DD for overdue |
| `overdue_days` | integer | YES | Days overdue (1, 3, or 7) for overdue notifications |
| `sent_at` | timestamp | NO | When the notification was sent |
| `message_data` | varchar(5000) | YES | Stored message content for audit |
| `send_status` | varchar(20) | NO | Status: 'sent' or 'failed' |
| `error_message` | varchar(500) | YES | Error details if send failed |
| `created_at` | timestamp | NO | Record creation timestamp |

### 3. Foreign Key Constraints

```sql
ALTER TABLE "notification_history" 
  ADD CONSTRAINT "notification_history_loan_id_loans_id_fk" 
  FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id");

ALTER TABLE "notification_history" 
  ADD CONSTRAINT "notification_history_client_id_clients_id_fk" 
  FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");
```

### 4. Indexes

```sql
-- Composite index for duplicate checking
CREATE INDEX "idx_notification_history_loan_type_period" 
  ON "notification_history" USING btree (
    "loan_id",
    "notification_type",
    "billing_period"
  );

-- Index for time-based queries
CREATE INDEX "idx_notification_history_sent_at" 
  ON "notification_history" USING btree ("sent_at");
```

## Verification

The migration was verified using the following tests:

1. ✅ Enum type `notification_type` exists
2. ✅ Table `notification_history` exists
3. ✅ All 12 required columns present
4. ✅ Foreign key constraints to `loans` and `clients` tables
5. ✅ Both required indexes created
6. ✅ Insert, query, and duplicate check operations work correctly

### Verification Scripts

- **Schema Verification**: `api/script/verify-notification-migration.ts`
- **Table Operations Test**: `api/script/test-notification-table.ts`

## Usage

### Duplicate Prevention Query

```typescript
const existing = await db
  .select()
  .from(notificationHistory)
  .where(
    and(
      eq(notificationHistory.loan_id, loanId),
      eq(notificationHistory.notification_type, type),
      eq(notificationHistory.billing_period, period)
    )
  );
```

### Recording Notification

```typescript
await db.insert(notificationHistory).values({
  id: uuidv7(),
  loan_id: loan.id,
  client_id: loan.client_id,
  line_user_id: lineUserId,
  notification_type: 'billing',
  billing_period: '2025-01',
  sent_at: new Date(),
  send_status: 'sent',
  created_at: new Date(),
});
```

## Rollback

Drizzle Kit does not support automatic rollback. To manually rollback:

```sql
DROP TABLE IF EXISTS notification_history;
DROP TYPE IF EXISTS notification_type;
```

**⚠️ Warning**: This will delete all notification history data.

## Related Files

- Schema: `api/src/core/database/schema/notification-history.schema.ts`
- Types: `api/src/features/notifications/notification.types.ts`
- Repository: `api/src/features/notifications/notification-history.repository.ts`
- Migration: `api/drizzle/0004_talented_namora.sql`

## Requirements Validated

This migration satisfies **Requirement 6.4** from the Payment Notification Scheduler specification:

> WHEN recording notification history, THEN the Notification Scheduler SHALL store the loan ID, client ID, LINE user ID, notification type, sent timestamp, and billing period
