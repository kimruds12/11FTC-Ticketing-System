"use client";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";

/**
 * Starts the Google OAuth (PKCE) flow. Supabase redirects to Google, then back to
 * `/auth/callback`, which exchanges the code for a session and forwards to `next`.
 */
export function SignInButton({ next = "/dashboard" }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = getBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setLoading(false); // on success the browser navigates away
  }

  return (
    <Button onClick={signIn} disabled={loading}>
      {loading ? "Redirecting…" : "Sign in with Google"}
    </Button>
  );
}
