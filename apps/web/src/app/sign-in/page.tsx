import type { Metadata } from "next";
import Image from "next/image";
import SignInForm from "@/features/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign In — FTraCe",
  description: "Sign in to manage IT service tickets and oversee infrastructure operations.",
};

export default function SignInPage() {
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
      <div className="relative z-10 w-full max-w-[430px] bg-white/15 backdrop-blur-xl rounded-[2.5rem] shadow-[0_25px_50px_rgba(0,0,0,0.25)] p-8 sm:p-10 border border-white/20 flex flex-col">
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
        <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-8 font-sans">Enter your credentials here:</p>

        <SignInForm />

        <p className="mt-8 text-center text-sm text-white/60 font-sans">
          No account?{" "}
          <a href="#" className="text-red-400 font-bold hover:text-red-300 hover:underline">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}
