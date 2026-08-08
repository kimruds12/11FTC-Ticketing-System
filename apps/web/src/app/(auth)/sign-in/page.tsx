import type { Metadata } from "next";
import Image from "next/image";
import { SignInForm } from "@/features/auth/components/SignInForm";

export const metadata: Metadata = {
  title: "Sign In — FTraCe",
  description:
    "Sign in to manage IT service tickets and oversee infrastructure operations.",
};

/**
 * Sign-in screen (M1). Internal-only: email + password (ADR-0018, superseding ADR-0013).
 *
 * Google OAuth was dropped because the system deploys to a self-hosted Supabase on the
 * company's internal network with no purchased domain, and Google rejects redirect URIs on
 * private IPs and non-public TLDs. There is no self-registration — accounts are provisioned
 * by an administrator, who also sets the initial password, since an isolated network has no
 * mail server to send an invite through.
 *
 * Authentication and authorization stay separate: signing in proves who you are, and the
 * `public.users` allowlist decides whether you may in. An account without a row authenticates
 * and is then rejected by the app shell as not-authorized.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center lg:justify-between px-6 sm:px-16 lg:px-28 py-12 overflow-x-hidden overflow-y-auto">
      {/* ── Background Image Layer ──────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/RedbackgroundImage.jpg"
          alt="11FTC Facility"
          fill
          className="object-cover"
          priority
          quality={95}
        />
        {/* Soft overlay for readability and premium look */}
        <div className="absolute inset-0 bg-slate-900/50" />
      </div>

      {/* ── Brand Content (Left Side - Desktop Only) ────────── */}
      <div className="relative z-10 text-left max-w-lg lg:block hidden">
        {/* Logo + name */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="relative w-12 h-12 bg-white/95 p-1.5 rounded-2xl shadow-xl backdrop-blur-sm">
            <Image src="/logo.png" alt="11FTC Logo" fill className="object-contain p-1.5" />
          </div>
          <div>
            <div className="text-white font-extrabold text-2xl tracking-tight leading-none mb-1">
              FTraCe
            </div>
            <div className="text-white/60 text-[9px] font-bold uppercase tracking-widest leading-none">
              11FTC Ticketing System
            </div>
          </div>
        </div>

        <h1 className="text-white text-3xl md:text-4xl lg:text-5xl font-black mb-4 leading-tight">
          IT Service Management
        </h1>
        <p className="text-slate-200/90 text-sm md:text-base leading-relaxed max-w-md mb-8">
          Sign in to manage IT service tickets, track asset performance, and oversee
          infrastructure operations in real-time.
        </p>
      </div>

      {/* ── Curved Sign-In Card (Right Side / Centered on Mobile) ── */}
      <div className="relative z-10 w-full max-w-[430px] bg-slate-950/40 backdrop-blur-xl rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.35)] p-8 sm:p-10 border border-white/10 flex flex-col">
        {/* Mobile Logo Header */}
        <div className="flex items-center gap-3 mb-8 lg:hidden">
          <div className="relative w-9 h-9 bg-white/10 p-1.5 rounded-xl border border-white/10">
            <Image src="/logo.png" alt="11FTC Logo" fill className="object-contain p-0.5" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-white leading-none block mb-0.5 font-sans">FTraCe</span>
            <span className="text-[9px] text-white/50 uppercase tracking-widest font-bold font-sans">11FTC IT</span>
          </div>
        </div>

        <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight font-sans">Sign In</h2>
        <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-8 font-sans">
          IT department — internal access only
        </p>

        {/* Surfaced by the app shell: authenticated, but not on the `public.users` allowlist. */}
        {error === "not-authorized" ? (
          <p className="mb-6 rounded-lg border border-amber-400/30 bg-amber-500/15 p-3 text-sm text-amber-100">
            That account isn&apos;t authorized for this system. Ask an IT administrator to
            invite you.
          </p>
        ) : error ? (
          <p className="mb-6 rounded-lg border border-red-400/30 bg-red-500/15 p-3 text-sm text-red-100">
            Sign-in failed. Please try again.
          </p>
        ) : null}

        <SignInForm next="/dashboard" />
      </div>
    </div>
  );
}
