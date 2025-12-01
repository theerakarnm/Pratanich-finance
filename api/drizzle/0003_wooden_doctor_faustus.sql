CREATE TYPE "public"."transaction_status" AS ENUM('Pending', 'Completed', 'Failed', 'Reversed');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('Payment', 'Disbursement', 'Fee', 'Adjustment');--> statement-breakpoint
CREATE TYPE "public"."pending_payment_status" AS ENUM('Unmatched', 'Matched', 'Processed', 'Rejected');--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"transaction_ref_id" varchar(100) NOT NULL,
	"loan_id" varchar(36) NOT NULL,
	"client_id" varchar(36) NOT NULL,
	"transaction_type" "transaction_type" NOT NULL,
	"transaction_status" "transaction_status" DEFAULT 'Completed' NOT NULL,
	"payment_date" timestamp NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"amount_to_penalties" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"amount_to_interest" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"amount_to_principal" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"principal_remaining" numeric(12, 2) NOT NULL,
	"payment_method" varchar(50),
	"payment_source" varchar(100),
	"receipt_path" varchar(255),
	"notes" varchar(500),
	"processed_by" varchar(36),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_transaction_ref_id_unique" UNIQUE("transaction_ref_id")
);
--> statement-breakpoint
CREATE TABLE "pending_payments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"transaction_ref_id" varchar(100) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"payment_date" timestamp NOT NULL,
	"sender_info" jsonb NOT NULL,
	"receiver_info" jsonb NOT NULL,
	"bank_info" jsonb NOT NULL,
	"status" "pending_payment_status" DEFAULT 'Unmatched' NOT NULL,
	"matched_loan_id" varchar(36),
	"matched_by" varchar(36),
	"matched_at" timestamp,
	"processed_transaction_id" varchar(36),
	"processed_at" timestamp,
	"admin_notes" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pending_payments_transaction_ref_id_unique" UNIQUE("transaction_ref_id")
);
--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "principal_paid" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "interest_paid" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "penalties_paid" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "total_penalties" numeric(12, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "last_payment_date" timestamp;--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "last_payment_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "previous_status" "contract_status";--> statement-breakpoint
ALTER TABLE "loans" ADD COLUMN "status_changed_at" timestamp;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_payments" ADD CONSTRAINT "pending_payments_matched_loan_id_loans_id_fk" FOREIGN KEY ("matched_loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_payments" ADD CONSTRAINT "pending_payments_processed_transaction_id_transactions_id_fk" FOREIGN KEY ("processed_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_transactions_transaction_ref_id" ON "transactions" USING btree ("transaction_ref_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_loan_id" ON "transactions" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_client_id" ON "transactions" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_payment_date" ON "transactions" USING btree ("payment_date");