import { SignInButton } from "@/features/auth/components/SignInButton";

/**
 * Sign-in screen (M1). Internal-only: the sole path in is Google OAuth. Authorization is the
 * `public.users` allowlist (ADR-0013) — signing in with a non-invited Gmail authenticates
 * but the app shell then rejects it as not-authorized.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold">11FTC Ticketing</h1>
        <p className="mt-1 text-sm text-gray-600">IT department — internal access only.</p>
      </div>

      {error === "not-authorized" ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          Your Google account isn&apos;t authorized for this system. Contact an IT
          administrator to be invited.
        </p>
      ) : error ? (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          Sign-in failed. Please try again.
        </p>
      ) : null}

      <SignInButton next="/account" />
    </main>
  );
}
