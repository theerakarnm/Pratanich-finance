import { pgTable, varchar, date, timestamp, decimal, integer, pgEnum } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { clients } from "./clients.schema";

export const contractStatusEnum = pgEnum("contract_status", ["Active", "Closed", "Overdue"]);

export const loans = pgTable("loans", {
  id: varchar("id", { length: 36 })
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  contract_number: varchar("contract_number", { length: 50 }).unique().notNull(),
  client_id: varchar("client_id", { length: 36 })
    .references(() => clients.id)
    .notNull(),
  loan_type: varchar("loan_type", { length: 50 }).notNull(),
  principal_amount: decimal("principal_amount", { precision: 12, scale: 2 }).notNull(),
  approved_amount: decimal("approved_amount", { precision: 12, scale: 2 }).notNull(),
  interest_rate: decimal("interest_rate", { precision: 5, scale: 2 }).notNull(),
  term_months: integer("term_months").notNull(),
  installment_amount: decimal("installment_amount", { precision: 12, scale: 2 }).notNull(),
  contract_start_date: date("contract_start_date").notNull(),
  contract_end_date: date("contract_end_date").notNull(),
  due_day: integer("due_day").notNull(),
  contract_status: contractStatusEnum("contract_status").notNull(),
  outstanding_balance: decimal("outstanding_balance", { precision: 12, scale: 2 }).notNull(),
  overdue_days: integer("overdue_days").default(0).notNull(),
  
  // Payment tracking
  principal_paid: decimal("principal_paid", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  interest_paid: decimal("interest_paid", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  penalties_paid: decimal("penalties_paid", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  total_penalties: decimal("total_penalties", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  
  // Last payment tracking
  last_payment_date: timestamp("last_payment_date"),
  last_payment_amount: decimal("last_payment_amount", { precision: 12, scale: 2 }),
  
  // Status history
  previous_status: contractStatusEnum("previous_status"),
  status_changed_at: timestamp("status_changed_at"),
  
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  deleted_at: timestamp("deleted_at"),
});
