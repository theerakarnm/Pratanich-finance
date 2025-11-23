CREATE TABLE "slipok_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"trans_ref" varchar(50) NOT NULL,
	"sending_bank" varchar(10) NOT NULL,
	"receiving_bank" varchar(10) NOT NULL,
	"trans_date" varchar(10) NOT NULL,
	"trans_time" varchar(10) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"sender" jsonb NOT NULL,
	"receiver" jsonb NOT NULL,
	"success" boolean NOT NULL,
	"message" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
