import { pgTable, varchar, timestamp, decimal, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { loans } from "./loans.schema";
import { transactions } from "./transactions.schema";

export const pendingPaymentStatusEnum = pgEnum("pending_payment_status", [
  "Unmatched",
  "Matched",
  "Processed",
  "Rejected"
]);

export const pendingPayments = pgTable("pending_payments", {
  id: varchar("id", { length: 36 })
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  
  // SlipOK data
  transaction_ref_id: varchar("transaction_ref_id", { length: 100 })
    .unique()
    .notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  payment_date: timestamp("payment_date").notNull(),
  
  // Sender/Receiver info from SlipOK
  sender_info: jsonb("sender_info").notNull(),
  receiver_info: jsonb("receiver_info").notNull(),
  bank_info: jsonb("bank_info").notNull(),
  
  // Matching status
  status: pendingPaymentStatusEnum("status").default("Unmatched").notNull(),
  
  // Manual matching
  matched_loan_id: varchar("matched_loan_id", { length: 36 })
    .references(() => loans.id),
  matched_by: varchar("matched_by", { length: 36 }), // Admin user ID
  matched_at: timestamp("matched_at"),
  
  // Processing
  processed_transaction_id: varchar("processed_transaction_id", { length: 36 })
    .references(() => transactions.id),
  processed_at: timestamp("processed_at"),
  
  // Notes
  admin_notes: varchar("admin_notes", { length: 500 }),
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
