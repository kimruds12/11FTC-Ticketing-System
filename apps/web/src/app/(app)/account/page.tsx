import { ChangePasswordForm } from "@/features/auth";

/**
 * Account settings. Currently just the password, which is the one thing every user needs:
 * accounts are provisioned with an administrator-generated password (ADR-0018), so changing
 * it is the first action a new user should take.
 *
 * Open to every authenticated role — it acts on the caller's own account, resolved from the
 * verified session server-side.
 */
export default function AccountPage() {
  return (
    <div className="w-full space-y-6 px-4 py-6 md:px-8">
      <div>
        <h1 className="page-title">Account</h1>
        <p className="page-subtitle">Manage your sign-in credentials.</p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
