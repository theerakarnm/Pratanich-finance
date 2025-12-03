CREATE TYPE "public"."notification_type" AS ENUM('billing', 'warning', 'due_date', 'overdue');--> statement-breakpoint
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
--> statement-breakpoint
ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_history" ADD CONSTRAINT "notification_history_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notification_history_loan_type_period" ON "notification_history" USING btree ("loan_id","notification_type","billing_period");--> statement-breakpoint
CREATE INDEX "idx_notification_history_sent_at" ON "notification_history" USING btree ("sent_at");