"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { UserRole } from "@11ftc/shared";
import { setSession } from "@/store/slices/authSlice";

export default function SignInForm() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await new Promise((r) => setTimeout(r, 800));
      
      const cleanEmail = email.trim().toLowerCase();
      const isCorrectAdmin = cleanEmail === "admin@gmail.com" && password === "admin123";
      const isCorrectStaff = cleanEmail === "staff@gmail.com" && password === "staff123";

      if (isCorrectAdmin) {
        const role = UserRole.IT_ADMINISTRATOR;
        const fullName = "Admin User";
        const userId = "usr-admin";
        dispatch(setSession({ userId, role, fullName }));
        router.push("/dashboard");
      } else if (isCorrectStaff) {
        const role = UserRole.IT_STAFF;
        const fullName = "IT Staff";
        const userId = "usr-staff";
        dispatch(setSession({ userId, role, fullName }));
        router.push("/dashboard");
      } else {
        setError("Invalid email or password. Authorized access only.");
      }
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
      <div>
        <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@gmail.com"
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-150 shadow-sm font-sans"
          autoComplete="email"
          required
        />
      </div>

      {/* Password */}
      <div>
        <label className="block text-xs font-bold text-white/80 uppercase tracking-wider mb-2">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-150 shadow-sm font-sans pr-12"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Remember + Forgot */}
      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-white/20 bg-white/10 text-primary-600 focus:ring-primary-500/30"
          />
          <span className="text-white/80 font-medium font-sans">Remember me</span>
        </label>
        <a href="#" className="text-white/90 font-semibold hover:text-white hover:underline font-sans">
          Forgot password?
        </a>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-200 font-medium font-sans">
          <svg className="w-4 h-4 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-primary-700 hover:bg-primary-600 active:bg-primary-800 text-white font-bold rounded-xl transition-all duration-200 tracking-wider shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm uppercase font-sans"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing in…
          </>
        ) : (
          "Sign In"
        )}
      </button>
    </form>
  );
}
