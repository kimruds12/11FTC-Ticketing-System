"use client";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { clearSession } from "@/store/slices/authSlice";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  async function signOut() {
    await getBrowserSupabase().auth.signOut();
    dispatch(clearSession());
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <Button variant="secondary" onClick={signOut}>
      Sign out
    </Button>
  );
}
