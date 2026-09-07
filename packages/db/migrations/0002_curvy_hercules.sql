ALTER TABLE "users" ADD COLUMN "auth_uid" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_auth_uid_unique" UNIQUE("auth_uid");