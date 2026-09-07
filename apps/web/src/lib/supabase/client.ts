"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Browser-side Supabase client. Uses @supabase/ssr for correct cookie handling
 * with Next.js. This client is used ONLY for Auth operations (signIn, signOut,
 * getSession). Data access goes through the NestJS API — never through
 * supabase-js (architecture.md, CLAUDE.md invariant).
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
