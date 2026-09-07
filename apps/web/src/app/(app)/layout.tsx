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

  let me: { userId: string; role: any; fullName: string; email: string } | null = null;
  try {
    me = await authService(serverApi()).me();
  } catch {
    // If the API server is offline or unreachable from SSR, fallback to checking public.users directly via Supabase client.
    try {
      const { data: dbUser } = await supabase
        .from("users")
        .select("user_id, role, full_name, email, is_active")
        .eq("auth_uid", user.id)
        .maybeSingle();

      if (dbUser && dbUser.is_active) {
        me = {
          userId: dbUser.user_id as string,
          role: dbUser.role,
          fullName: dbUser.full_name as string,
          email: dbUser.email as string,
        };
      }
    } catch {
      // Ignore database fallback error and handle redirect below
    }
  }

  if (!me) {
    redirect("/sign-in?error=not-authorized");
  }

  return (
    <AuthHydrator initial={me}>
      <AppLayout>{children}</AppLayout>
    </AuthHydrator>
  );
}
