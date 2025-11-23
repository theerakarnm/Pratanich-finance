import { pgTable, varchar, date, timestamp } from "drizzle-orm/pg-core";
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
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
  deleted_at: timestamp("deleted_at"),
});
