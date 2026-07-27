import { serverApi } from "@/services/server";
import { authService } from "@/services/auth.service";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

/**
 * Minimal account page — the M1 end-to-end proof: Google sign-in → Supabase session →
 * `Authorization: Bearer` → NestJS AuthGuard (JWKS verify + allowlist) → `GET /me`. If you
 * can see your `AuthContext` here, the whole auth chain works. Real screens (encode, queue,
 * dashboard) land per their feature guides.
 */
export default async function AccountPage() {
  const me = await authService(serverApi()).me();

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Signed in</h1>
        <SignOutButton />
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Your verified identity from <code>GET /api/v1/me</code>:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-md bg-gray-50 p-4 text-sm">
        {JSON.stringify(me, null, 2)}
      </pre>
    </main>
  );
}
