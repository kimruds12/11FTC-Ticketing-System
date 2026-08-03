CREATE TABLE "technicians" (
	"technician_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"name_normalized" varchar(120) NOT NULL,
	"user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "technicians_name_normalized_unique" UNIQUE("name_normalized")
);
--> statement-breakpoint
CREATE TABLE "ticket_assignees" (
	"ticket_id" uuid NOT NULL,
	"technician_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ticket_assignees_ticket_id_technician_id_pk" PRIMARY KEY("ticket_id","technician_id")
);
--> statement-breakpoint
ALTER TABLE "technicians" ADD CONSTRAINT "technicians_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_assignees" ADD CONSTRAINT "ticket_assignees_ticket_id_tickets_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_assignees" ADD CONSTRAINT "ticket_assignees_technician_id_technicians_technician_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("technician_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ticket_assignees_technician" ON "ticket_assignees" USING btree ("technician_id");--> statement-breakpoint
-- Same reasoning as migration 0001: Supabase auto-exposes every public-schema table over
-- PostgREST with the anon key that ships in the web app. ENABLE (never FORCE) denies the
-- anon/authenticated roles while the backend, which owns the tables, bypasses RLS. A new
-- table that skips this is a silent hole.
ALTER TABLE "technicians"      ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket_assignees" ENABLE ROW LEVEL SECURITY;