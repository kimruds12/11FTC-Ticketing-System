-- Custom SQL migration file, put your code below! --

-- Supabase hardening: enable Row Level Security on every table, with NO policies.
--
-- WHY: Supabase auto-exposes a PostgREST REST API over every table in the `public`
-- schema, reachable with the ANON key — and the anon key ships in the web app. Without
-- RLS, anyone holding that key could read/write these tables directly and bypass the
-- entire NestJS API: the server-side state machine, the "no delete" rule, numbering,
-- audit, all of it. That is unacceptable (the database is the system of record and the
-- ONLY writer is TicketService).
--
-- HOW: enabling RLS with no policies denies all access through PostgREST (the `anon` and
-- `authenticated` roles). Our backend does NOT go through PostgREST — it connects over the
-- session pooler as the `postgres` role, which OWNS these tables, and a table owner
-- BYPASSES RLS. So the API and worker keep full access while the public REST surface is
-- closed.
--
-- DO NOT use `FORCE ROW LEVEL SECURITY` here. FORCE makes RLS apply to the table owner too,
-- and since our backend connects AS the owner, FORCE + no-policies locks the backend out of
-- its own tables (every SELECT returns zero rows → looks like "row not found"). ENABLE
-- alone is exactly right: PostgREST roles denied, owner (backend) unaffected.
--
-- If a table is ever meant to be readable directly via PostgREST, add an explicit policy in
-- a later migration — deliberately, not by default.

ALTER TABLE "users"               ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "departments"         ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "main_issue_category" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "employees"           ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ticket_sequence"     ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tickets"             ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log"           ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sync_outbox"         ENABLE ROW LEVEL SECURITY;
