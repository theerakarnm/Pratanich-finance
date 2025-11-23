import { pgTable, varchar, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const slipokLogs = pgTable("slipok_logs", {
  id: varchar("id", { length: 36 })
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  transRef: varchar("trans_ref", { length: 50 }).notNull(),
  sendingBank: varchar("sending_bank", { length: 10 }).notNull(),
  receivingBank: varchar("receiving_bank", { length: 10 }).notNull(),
  transDate: varchar("trans_date", { length: 10 }).notNull(),
  transTime: varchar("trans_time", { length: 10 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  sender: jsonb("sender").notNull(),
  receiver: jsonb("receiver").notNull(),
  success: boolean("success").notNull(),
  message: varchar("message", { length: 255 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
