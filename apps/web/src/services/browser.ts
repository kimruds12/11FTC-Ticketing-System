"use client";
import { createApiClient } from "./http";
import { getBrowserToken } from "@/lib/supabase/browser";

/**
 * Browser-side API client — for client thunks and interactive hooks (e.g. the employee
 * typeahead). The token comes from the live Supabase session. Prefer Server Components /
 * Server Actions for reads and mutations; reach for this only when a fetch genuinely must
 * happen per interaction on the client (architecture.md, pattern 3).
 */
export function browserApi() {
  return createApiClient(getBrowserToken);
}
