CREATE TYPE "public"."audit_action" AS ENUM('CREATE', 'UPDATE', 'ASSIGN', 'STATUS_CHANGE', 'CLOSE');--> statement-breakpoint
CREATE TYPE "public"."outbox_operation" AS ENUM('UPSERT');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('PENDING', 'SENT', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('Open', 'Ongoing', 'Closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('IT_ADMINISTRATOR', 'IT_STAFF');--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"department_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "departments_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "main_issue_category" (
	"main_issue_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "main_issue_category_label_unique" UNIQUE("label")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"employee_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_normalized" varchar(255) NOT NULL,
	"department_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_name_normalized_unique" UNIQUE("name_normalized")
);
--> statement-breakpoint
CREATE TABLE "ticket_sequence" (
	"scope_key" varchar(32) PRIMARY KEY NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"ticket_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_no" varchar(32) NOT NULL,
	"date" date NOT NULL,
	"sequence_scope" varchar(32) NOT NULL,
	"sequence_number" integer NOT NULL,
	"employee_id" uuid NOT NULL,
	"main_issue_id" uuid NOT NULL,
	"concern" text NOT NULL,
	"assigned_to" uuid,
	"created_by" uuid NOT NULL,
	"status" "ticket_status" NOT NULL,
	"remarks" text,
	"ongoing_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tickets_ticket_no_unique" UNIQUE("ticket_no"),
	CONSTRAINT "uq_ticket_seq" UNIQUE("sequence_scope","sequence_number")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"audit_log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"action" "audit_action" NOT NULL,
	"field_name" varchar(64) NOT NULL,
	"previous_value" text,
	"new_value" text,
	"updated_by" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_outbox" (
	"outbox_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"operation" "outbox_operation" DEFAULT 'UPSERT' NOT NULL,
	"row_key" varchar(32) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"raw_row_number" integer,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_department_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("department_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_sequence_scope_ticket_sequence_scope_key_fk" FOREIGN KEY ("sequence_scope") REFERENCES "public"."ticket_sequence"("scope_key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_employee_id_employees_employee_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("employee_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_main_issue_id_main_issue_category_main_issue_id_fk" FOREIGN KEY ("main_issue_id") REFERENCES "public"."main_issue_category"("main_issue_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_users_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_users_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_ticket_id_tickets_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_updated_by_users_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_outbox" ADD CONSTRAINT "sync_outbox_ticket_id_tickets_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("ticket_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tickets_date" ON "tickets" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_tickets_status" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tickets_assigned_status" ON "tickets" USING btree ("assigned_to","status");--> statement-breakpoint
CREATE INDEX "idx_tickets_closed_at" ON "tickets" USING btree ("closed_at");--> statement-breakpoint
CREATE INDEX "idx_outbox_status_created" ON "sync_outbox" USING btree ("status","created_at");