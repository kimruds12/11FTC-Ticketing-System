import { redirect } from "next/navigation";

/**
 * Root page — redirect to sign-in.
 */
export default function HomePage() {
  redirect("/sign-in");
}
