ALTER TABLE "tickets" DROP CONSTRAINT "tickets_assigned_to_users_user_id_fk";
--> statement-breakpoint
DROP INDEX "idx_tickets_assigned_status";--> statement-breakpoint
ALTER TABLE "tickets" DROP COLUMN "assigned_to";--> statement-breakpoint
ALTER TABLE "tickets" DROP COLUMN "assigned_label";