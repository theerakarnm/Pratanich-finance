import { pgTable, varchar, date, timestamp, index } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const clients = pgTable("clients", {
  id: varchar("id", { length: 36 })
    .$defaultFn(() => uuidv7())
    .primaryKey(),
  citizen_id: varchar("citizen_id", { length: 20 }).unique().notNull(),
  title_name: varchar("title_name", { length: 20 }).notNull(),
  first_name: varchar("first_name", { length: 100 }).notNull(),
  last_name: varchar("last_name", { length: 100 }).notNull(),
  date_of_birth: date("date_of_birth").notNull(),
  mobile_number: varchar("mobile_number", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  line_id: varchar("line_id", { length: 100 }),
  line_user_id: varchar("line_user_id", { length: 100 }).unique(),
  line_display_name: varchar("line_display_name", { length: 255 }),
  line_picture_url: varchar("line_picture_url", { length: 500 }),
  connected_at: timestamp("connected_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  deleted_at: timestamp("deleted_at"),
}, (table) => ({
  lineUserIdIdx: index("idx_clients_line_user_id").on(table.line_user_id),
}));
