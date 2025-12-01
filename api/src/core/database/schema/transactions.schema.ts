import { pgTable, varchar, timestamp, decimal, pgEnum, index } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { loans } from "./loans.schema";
import { clients } from "./clients.schema";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "Payment",
  "Disbursement",
  "Fee",
  "Adjustment"
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "Pending",
  "Completed",
  "Failed",
  "Reversed"
]);

export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 36 })
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  
  // Reference IDs
  transaction_ref_id: varchar("transaction_ref_id", { length: 100 })
    .unique()
    .notNull(),
  loan_id: varchar("loan_id", { length: 36 })
    .references(() => loans.id)
    .notNull(),
  client_id: varchar("client_id", { length: 36 })
    .references(() => clients.id)
    .notNull(),
  
  // Transaction details
  transaction_type: transactionTypeEnum("transaction_type").notNull(),
  transaction_status: transactionStatusEnum("transaction_status")
    .default("Completed")
    .notNull(),
  payment_date: timestamp("payment_date").notNull(),
  
  // Amounts
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  amount_to_penalties: decimal("amount_to_penalties", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  amount_to_interest: decimal("amount_to_interest", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  amount_to_principal: decimal("amount_to_principal", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  
  // Balance snapshots (after this transaction)
  balance_after: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
  principal_remaining: decimal("principal_remaining", { precision: 12, scale: 2 }).notNull(),
  
  // Payment method and source
  payment_method: varchar("payment_method", { length: 50 }), // "Bank Transfer", "Cash", "PromptPay"
  payment_source: varchar("payment_source", { length: 100 }), // Bank name or source
  
  // Receipt
  receipt_path: varchar("receipt_path", { length: 255 }),
  
  // Metadata
  notes: varchar("notes", { length: 500 }),
  processed_by: varchar("processed_by", { length: 36 }), // Admin user ID if manual
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  transactionRefIdIdx: index("idx_transactions_transaction_ref_id").on(table.transaction_ref_id),
  loanIdIdx: index("idx_transactions_loan_id").on(table.loan_id),
  clientIdIdx: index("idx_transactions_client_id").on(table.client_id),
  paymentDateIdx: index("idx_transactions_payment_date").on(table.payment_date),
}));
