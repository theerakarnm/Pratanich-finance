ALTER TABLE "transactions" ADD COLUMN "days_since_last_tx" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "applied_rate" numeric(5, 4);