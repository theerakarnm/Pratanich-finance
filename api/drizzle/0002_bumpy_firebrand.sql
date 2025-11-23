CREATE TABLE "connect_codes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"code" varchar(9) NOT NULL,
	"client_id" varchar(36) NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "connect_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "connect_rate_limit" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"client_id" varchar(36) NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	"blocked_until" timestamp
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "line_user_id" varchar(100);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "line_display_name" varchar(255);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "line_picture_url" varchar(500);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "connected_at" timestamp;--> statement-breakpoint
ALTER TABLE "connect_codes" ADD CONSTRAINT "connect_codes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connect_rate_limit" ADD CONSTRAINT "connect_rate_limit_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_connect_codes_code" ON "connect_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_connect_codes_client_id" ON "connect_codes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_connect_rate_limit_client_id" ON "connect_rate_limit" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_clients_line_user_id" ON "clients" USING btree ("line_user_id");--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_line_user_id_unique" UNIQUE("line_user_id");