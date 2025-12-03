import { pgTable, varchar, timestamp, integer, pgEnum, index } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { loans } from "./loans.schema";
import { clients } from "./clients.schema";

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
}, (table) => ({
  loanTypePeriodIdx: index("idx_notification_history_loan_type_period")
    .on(table.loan_id, table.notification_type, table.billing_period),
  sentAtIdx: index("idx_notification_history_sent_at")
    .on(table.sent_at),
}));
