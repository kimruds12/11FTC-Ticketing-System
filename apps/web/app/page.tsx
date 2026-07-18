import { redirect } from "next/navigation";

/**
 * Root redirect — authenticated users go to /dashboard,
 * unauthenticated users go to sign-in.
 * For now redirects to sign-in as the app shell handles session checks.
 */
export default function RootPage() {
  redirect("/sign-in");
}
