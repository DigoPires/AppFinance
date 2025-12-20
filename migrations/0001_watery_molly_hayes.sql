ALTER TABLE "expenses" ADD COLUMN "payment_date" date;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "is_paid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "created_at" timestamp DEFAULT NOW() NOT NULL;