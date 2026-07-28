import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Root — route into the app based on session. Signed-in users land on the app; everyone
 * else goes to sign-in. Real routes (tickets, dashboard) are added per
 * docs/implementation/frontend/.
 */
export default async function HomePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/sign-in");
}
