import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { serverApi } from "@/services/server";
import { authService } from "@/services/auth.service";
import { AuthHydrator } from "@/features/auth/components/AuthHydrator";
import AppLayout from "@/components/layout/AppLayout";

/**
 * Protected app shell (M1). Two gates, both server-side:
 *   1. No Supabase session → redirect to sign-in.
 *   2. Signed in but not on the `public.users` allowlist → our API returns 403 on `/me`;
 *      redirect to sign-in with a "not authorized" notice.
 * On success, seed the client auth mirror (AuthHydrator) and render the app chrome.
 */
export default async function AppRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  let me;
  try {
    me = await authService(serverApi()).me();
  } catch {
    // 403 (no-user-row / inactive) or any failure resolving the AuthContext.
    redirect("/sign-in?error=not-authorized");
  }

  return (
    <AuthHydrator initial={me}>
      <AppLayout>{children}</AppLayout>
    </AuthHydrator>
  );
}
