# Requirements Document

## Introduction

This document specifies the requirements for a scheduled payment notification system that proactively reminds clients about upcoming and overdue loan payments via LINE messaging. The system must run automated cron jobs to identify loans requiring notifications, send appropriately timed reminders using Flex Message templates, and maintain notification history to prevent duplicate messages. The scheduler will send billing notifications 15 days before due dates, warning notifications 3 days before due dates, due date reminders on the payment day, and overdue notifications for late payments.

## Glossary

- **Notification Scheduler**: The automated system component that runs periodic jobs to identify and send payment notifications
- **Cron Job**: A time-based scheduled task that executes at specified intervals
- **Billing Notification**: A reminder sent 15 days before a payment due date informing clients of upcoming payment obligations
- **Warning Notification**: An urgent reminder sent 3 days before a payment due date
- **Due Date Notification**: A critical reminder sent on the day payment is due
- **Overdue Notification**: A notification sent after a payment due date has passed without payment
- **Flex Message**: A rich, structured message format supported by LINE Messaging API for displaying formatted content
- **Notification Window**: The time period during which a specific notification type should be sent
- **Loan Contract**: A financial agreement with scheduled payment due dates and outstanding balances
- **LINE User ID**: The unique identifier for a client's LINE account used for message delivery
- **Notification History**: A record of all notifications sent to prevent duplicate messages

## Requirements

### Requirement 1: Billing Notification Scheduling (15 Days Before Due Date)

**User Story:** As a client, I want to receive a billing notification 15 days before my payment is due, so that I have adequate time to prepare the payment.

#### Acceptance Criteria

1. WHEN the Notification Scheduler runs the billing notification job, THEN the Notification Scheduler SHALL identify all loan contracts with due dates exactly 15 days in the future
2. WHEN identifying loans for billing notifications, THEN the Notification Scheduler SHALL filter for loans with Active or Overdue status
3. WHEN a loan qualifies for billing notification, THEN the Notification Scheduler SHALL verify that a billing notification has not already been sent for the current billing period
4. WHEN sending a billing notification, THEN the Notification Scheduler SHALL use the createBillingMessage Flex Message template with loan details
5. WHEN a billing notification is sent successfully, THEN the Notification Scheduler SHALL record the notification in the notification history table

### Requirement 2: Warning Notification Scheduling (3 Days Before Due Date)

**User Story:** As a client, I want to receive a warning notification 3 days before my payment is due, so that I am reminded to make the payment soon.

#### Acceptance Criteria

1. WHEN the Notification Scheduler runs the warning notification job, THEN the Notification Scheduler SHALL identify all loan contracts with due dates exactly 3 days in the future
2. WHEN identifying loans for warning notifications, THEN the Notification Scheduler SHALL filter for loans with Active or Overdue status and outstanding balances greater than zero
3. WHEN a loan qualifies for warning notification, THEN the Notification Scheduler SHALL verify that a warning notification has not already been sent for the current billing period
4. WHEN sending a warning notification, THEN the Notification Scheduler SHALL use the createDueWarningMessage Flex Message template with days remaining and payment details
5. WHEN a warning notification is sent successfully, THEN the Notification Scheduler SHALL record the notification in the notification history table

### Requirement 3: Due Date Notification Scheduling (On Due Date)

**User Story:** As a client, I want to receive a notification on the day my payment is due, so that I am reminded to make the payment before the deadline.

#### Acceptance Criteria

1. WHEN the Notification Scheduler runs the due date notification job, THEN the Notification Scheduler SHALL identify all loan contracts with due dates matching the current date
2. WHEN identifying loans for due date notifications, THEN the Notification Scheduler SHALL filter for loans with Active or Overdue status and outstanding balances greater than zero
3. WHEN a loan qualifies for due date notification, THEN the Notification Scheduler SHALL verify that a due date notification has not already been sent for the current date
4. WHEN sending a due date notification, THEN the Notification Scheduler SHALL use the createDueDateMessage Flex Message template emphasizing urgency
5. WHEN a due date notification is sent successfully, THEN the Notification Scheduler SHALL record the notification in the notification history table

### Requirement 4: Overdue Notification Scheduling (After Due Date)

**User Story:** As a client, I want to receive notifications when my payment is overdue, so that I am aware of late payment consequences and can take action.

#### Acceptance Criteria

1. WHEN the Notification Scheduler runs the overdue notification job, THEN the Notification Scheduler SHALL identify all loan contracts with due dates in the past and Overdue status
2. WHEN identifying loans for overdue notifications, THEN the Notification Scheduler SHALL calculate the number of days overdue for each loan
3. WHEN a loan is 1, 3, or 7 days overdue, THEN the Notification Scheduler SHALL send an overdue notification if one has not been sent for that specific overdue milestone
4. WHEN sending an overdue notification, THEN the Notification Scheduler SHALL use the createOverdueMessage Flex Message template with days overdue and penalty information
5. WHEN an overdue notification is sent successfully, THEN the Notification Scheduler SHALL record the notification in the notification history table with the overdue day count

### Requirement 5: Client and LINE User ID Resolution

**User Story:** As a system administrator, I want the scheduler to correctly identify client LINE accounts, so that notifications are delivered to the right recipients.

#### Acceptance Criteria

1. WHEN the Notification Scheduler identifies a loan requiring notification, THEN the Notification Scheduler SHALL look up the associated client record
2. WHEN looking up client information, THEN the Notification Scheduler SHALL retrieve the LINE user ID from the connect codes table using the client ID
3. IF no LINE user ID is found for a client, THEN the Notification Scheduler SHALL log a warning and skip notification for that loan
4. WHEN a client has multiple LINE connections, THEN the Notification Scheduler SHALL use the most recent active connection
5. WHEN a LINE connection is expired or inactive, THEN the Notification Scheduler SHALL skip notification and log the inactive connection

### Requirement 6: Notification History and Duplicate Prevention

**User Story:** As a system administrator, I want the system to prevent duplicate notifications, so that clients are not spammed with repeated messages.

#### Acceptance Criteria

1. WHEN the Notification Scheduler prepares to send a notification, THEN the Notification Scheduler SHALL check the notification history table for existing notifications
2. WHEN checking notification history, THEN the Notification Scheduler SHALL filter by loan ID, notification type, and billing period or date
3. IF a notification of the same type has already been sent for the current period, THEN the Notification Scheduler SHALL skip sending and log the duplicate prevention
4. WHEN recording notification history, THEN the Notification Scheduler SHALL store the loan ID, client ID, LINE user ID, notification type, sent timestamp, and billing period
5. WHEN a notification fails to send, THEN the Notification Scheduler SHALL NOT record it in the notification history to allow retry

### Requirement 7: Cron Job Configuration and Scheduling

**User Story:** As a system administrator, I want the notification jobs to run automatically at appropriate times, so that clients receive timely notifications without manual intervention.

#### Acceptance Criteria

1. WHEN the application starts, THEN the Notification Scheduler SHALL initialize all cron jobs with their configured schedules
2. WHEN configuring the billing notification job, THEN the Notification Scheduler SHALL schedule it to run daily at 9:00 AM local time
3. WHEN configuring the warning notification job, THEN the Notification Scheduler SHALL schedule it to run daily at 9:00 AM local time
4. WHEN configuring the due date notification job, THEN the Notification Scheduler SHALL schedule it to run daily at 8:00 AM local time
5. WHEN configuring the overdue notification job, THEN the Notification Scheduler SHALL schedule it to run daily at 10:00 AM local time

### Requirement 8: Payment Link Generation

**User Story:** As a client, I want notification messages to include a payment link, so that I can easily access the payment interface.

#### Acceptance Criteria

1. WHEN generating a notification message, THEN the Notification Scheduler SHALL include a payment link in the Flex Message template
2. WHEN creating a payment link, THEN the Notification Scheduler SHALL use the LIFF URL with the loan contract ID as a parameter
3. WHEN a client clicks the payment link, THEN the link SHALL open the LINE LIFF payment interface for that specific loan
4. WHEN the LIFF URL is not configured, THEN the Notification Scheduler SHALL use a fallback URL or omit the payment link
5. WHEN including payment links, THEN the Notification Scheduler SHALL ensure the URL is properly encoded and valid

### Requirement 9: Error Handling and Resilience

**User Story:** As a system administrator, I want the notification scheduler to handle errors gracefully, so that temporary failures do not stop all notifications.

#### Acceptance Criteria

1. WHEN a cron job encounters an error, THEN the Notification Scheduler SHALL log the error with full context and continue processing remaining notifications
2. WHEN LINE message sending fails for a specific client, THEN the Notification Scheduler SHALL log the failure and continue with the next client
3. WHEN database queries fail, THEN the Notification Scheduler SHALL log the error and retry the job on the next scheduled run
4. WHEN the LINE Messaging API is unavailable, THEN the Notification Scheduler SHALL log the outage and allow retry on the next run
5. WHEN a notification fails to send, THEN the Notification Scheduler SHALL NOT mark it as sent in the notification history

### Requirement 10: Logging and Monitoring

**User Story:** As a system administrator, I want comprehensive logging of notification activities, so that I can monitor system health and troubleshoot issues.

#### Acceptance Criteria

1. WHEN a cron job starts, THEN the Notification Scheduler SHALL log the job name, start time, and scheduled execution time
2. WHEN identifying loans for notification, THEN the Notification Scheduler SHALL log the count of loans found and the selection criteria
3. WHEN sending each notification, THEN the Notification Scheduler SHALL log the loan ID, client ID, LINE user ID, notification type, and send result
4. WHEN a cron job completes, THEN the Notification Scheduler SHALL log the job name, end time, total notifications sent, and any errors encountered
5. WHEN errors occur, THEN the Notification Scheduler SHALL log the error message, stack trace, and relevant context for debugging

### Requirement 11: Notification Content Accuracy

**User Story:** As a client, I want notification messages to contain accurate and up-to-date information, so that I can trust the payment amounts and dates.

#### Acceptance Criteria

1. WHEN generating notification content, THEN the Notification Scheduler SHALL query the latest loan contract data including outstanding balance and due date
2. WHEN calculating payment amounts, THEN the Notification Scheduler SHALL include accrued interest up to the current date
3. WHEN displaying remaining balance, THEN the Notification Scheduler SHALL show the total outstanding balance including principal and interest
4. WHEN including penalty amounts in overdue notifications, THEN the Notification Scheduler SHALL calculate penalties based on the loan contract terms
5. WHEN formatting monetary amounts, THEN the Notification Scheduler SHALL display amounts in Thai Baht with proper thousand separators

### Requirement 12: Timezone Handling

**User Story:** As a system administrator, I want all notification scheduling to respect the local timezone, so that clients receive notifications at appropriate local times.

#### Acceptance Criteria

1. WHEN scheduling cron jobs, THEN the Notification Scheduler SHALL use Asia/Bangkok timezone for all time-based calculations
2. WHEN comparing dates for notification eligibility, THEN the Notification Scheduler SHALL convert all timestamps to Asia/Bangkok timezone
3. WHEN calculating days until due date, THEN the Notification Scheduler SHALL use date-only comparison in the local timezone
4. WHEN recording notification timestamps, THEN the Notification Scheduler SHALL store timestamps in UTC but display them in local timezone for logging
5. WHEN the system clock changes due to daylight saving or other reasons, THEN the Notification Scheduler SHALL adjust cron schedules accordingly
