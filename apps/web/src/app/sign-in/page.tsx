import type { Metadata } from "next";
import Image from "next/image";
import SignInForm from "@/features/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign In — FTraCe",
  description: "Sign in to manage IT service tickets and oversee infrastructure operations.",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-900">
      {/* ── Left panel (Hero / Branding) ─────────────────────────────────────────── */}
      <div
        className="flex flex-col justify-end p-8 lg:p-16 flex-1 relative overflow-hidden min-h-[40vh] lg:min-h-screen"
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #1e293b 40%, #0f172a 100%)",
        }}
      >
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Server room illustration overlay */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 40px,
              rgba(255,255,255,0.05) 40px,
              rgba(255,255,255,0.05) 41px
            ), repeating-linear-gradient(
              90deg,
              transparent,
              transparent 80px,
              rgba(255,255,255,0.05) 80px,
              rgba(255,255,255,0.05) 81px
            )`,
          }}
        />
        {/* Server rack silhouettes (simplified) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <svg viewBox="0 0 400 300" className="w-4/5 h-auto text-white fill-current">
            <rect x="60" y="40" width="80" height="220" rx="4" className="fill-white opacity-20" />
            <rect x="160" y="20" width="80" height="240" rx="4" className="fill-white opacity-15" />
            <rect x="260" y="60" width="80" height="200" rx="4" className="fill-white opacity-20" />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <g key={i}>
                <rect x="64" y={50 + i * 22} width="72" height="16" rx="2" className="fill-white opacity-30" />
                <rect x="164" y={30 + i * 22} width="72" height="16" rx="2" className="fill-white opacity-30" />
                <rect x="264" y={70 + i * 22} width="72" height="16" rx="2" className="fill-white opacity-30" />
                <circle cx={128} cy={58 + i * 22} r="2" className="fill-green-400 opacity-60" />
                <circle cx={228} cy={38 + i * 22} r="2" className="fill-green-400 opacity-60" />
                <circle cx={328} cy={78 + i * 22} r="2" className="fill-blue-400 opacity-60" />
              </g>
            ))}
          </svg>
        </div>

        {/* Brand content */}
        <div className="relative z-10">
          {/* Logo + name */}
          <div className="flex items-center gap-3 mb-6 md:mb-8">
            <div className="relative w-10 h-10 bg-white p-1 rounded-lg">
              <Image src="/logo.png" alt="11FTC Logo" fill className="object-contain p-1" />
            </div>
            <div>
              <div className="text-white font-bold text-2xl tracking-tight">FTraCe</div>
            </div>
          </div>

          <h1 className="text-white text-2xl md:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
            IT Service Management
          </h1>
          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-md opacity-90 mb-6 md:mb-10">
            Sign in to manage IT service tickets, track asset performance, and oversee
            infrastructure operations in real-time.
          </p>

          <div className="flex items-center gap-2 text-primary-200 text-xs font-semibold uppercase tracking-wider">
            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Authorized Access Only: IT Staff &amp; IT Admin
          </div>
        </div>
      </div>

      {/* ── Right panel (Sign-in form card) ─────────────────────────── */}
      <div className="flex-shrink-0 w-full lg:w-[460px] flex items-center justify-center bg-white p-6 md:p-12 min-h-[60vh] lg:min-h-screen">
        <div className="w-full max-w-sm">
          {/* Mobile logo header */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="relative w-8 h-8">
              <Image src="/logo.png" alt="11FTC Logo" fill className="object-contain" />
            </div>
            <span className="font-bold text-xl text-gray-900">FTraCe</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
          <p className="text-gray-500 text-sm mb-8">Enter your credentials to continue</p>

          <SignInForm />

          <p className="mt-8 text-center text-sm text-gray-500">
            No account?{" "}
            <a href="#" className="text-primary-700 font-semibold hover:underline">
              Register here
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
