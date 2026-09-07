CREATE TYPE "public"."ticket_source" AS ENUM('APP', 'IMPORT');--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "assigned_label" varchar(255);--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "source" "ticket_source" DEFAULT 'APP' NOT NULL;