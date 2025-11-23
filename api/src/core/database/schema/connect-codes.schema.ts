import { pgTable, varchar, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { clients } from "./clients.schema";

export const connectCodes = pgTable("connect_codes", {
  id: varchar("id", { length: 36 })
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  code: varchar("code", { length: 9 }).unique().notNull(),
  client_id: varchar("client_id", { length: 36 })
    .references(() => clients.id)
    .notNull(),
  is_used: boolean("is_used").default(false).notNull(),
  expires_at: timestamp("expires_at").notNull(),
  used_at: timestamp("used_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  codeIdx: index("idx_connect_codes_code").on(table.code),
  clientIdIdx: index("idx_connect_codes_client_id").on(table.client_id),
}));

export const connectRateLimit = pgTable("connect_rate_limit", {
  id: varchar("id", { length: 36 })
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  client_id: varchar("client_id", { length: 36 })
    .references(() => clients.id)
    .notNull(),
  attempt_count: integer("attempt_count").default(0).notNull(),
  window_start: timestamp("window_start").defaultNow().notNull(),
  blocked_until: timestamp("blocked_until"),
}, (table) => ({
  clientIdIdx: index("idx_connect_rate_limit_client_id").on(table.client_id),
}));
