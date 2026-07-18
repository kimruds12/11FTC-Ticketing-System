"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ── Employee Combobox ────────────────────────────────────── */
function EmployeeCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);

  const mock = [
    "Sarah Jenkins",
    "Marcus Chen",
    "Elena Rodriguez",
    "David Kim",
    "James Peterson",
  ].filter((n) => n.toLowerCase().includes(query.toLowerCase()) && query.length > 0);

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Type to search employees…"
        className="input"
        autoComplete="off"
      />
      {open && query.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {mock.map((name) => (
            <button
              key={name}
              type="button"
              onMouseDown={() => { onChange(name); setQuery(name); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
            >
              {name}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={() => { onChange(query); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-primary-700 font-medium border-t border-gray-100 hover:bg-primary-50 transition-colors"
          >
            + Create &quot;{query}&quot; as new employee
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function NewTicketPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    status: "CLOSED",
    employee: "",
    department: "",
    mainIssue: "",
    concern: "",
    assignedTo: "",
    remarks: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.employee || !form.department || !form.mainIssue || !form.concern) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    try {
      // TODO: POST /tickets via src/lib/api.ts
      await new Promise((r) => setTimeout(r, 600));
      router.push("/tickets");
    } catch {
      setError("Failed to create ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/tickets" className="hover:text-gray-600">Ticket Management</Link>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-700 font-medium">Encode Ticket</span>
      </div>

      <div className="card p-6">
        <h1 className="text-lg font-bold text-gray-900 mb-1">Encode New Ticket</h1>
        <p className="text-sm text-gray-400 mb-6">Record a resolved or ongoing IT concern.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Date + Status row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Date *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="input"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Past dates allowed (FR-5)</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Status *
              </label>
              <div className="flex gap-2">
                {["CLOSED", "ONGOING", "OPEN"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("status", s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                      form.status === s
                        ? s === "CLOSED"
                          ? "bg-green-600 text-white border-green-600"
                          : s === "ONGOING"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1">Defaults to Closed (FR-2)</p>
            </div>
          </div>

          {/* Employee */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Employee *
            </label>
            <EmployeeCombobox
              value={form.employee}
              onChange={(v) => set("employee", v)}
            />
            <p className="text-xs text-gray-400 mt-1">Search existing or create inline (FR-13, FR-14)</p>
          </div>

          {/* Department + Main Issue */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Department *
              </label>
              <select
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                className="input"
                required
              >
                <option value="">Select department…</option>
                {/* TODO: load from GET /departments (OPEN-4) */}
                <option>Finance</option>
                <option>Engineering</option>
                <option>Infrastructure</option>
                <option>Marketing</option>
                <option>Sales</option>
                <option>Procurement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Main Issue *
              </label>
              <select
                value={form.mainIssue}
                onChange={(e) => set("mainIssue", e.target.value)}
                className="input"
                required
              >
                <option value="">Select issue…</option>
                {/* TODO: load from GET /main-issues (OPEN-4) */}
                <option>Network / VPN</option>
                <option>Hardware</option>
                <option>Software / License</option>
                <option>Access / Authentication</option>
                <option>Printing</option>
                <option>Email</option>
              </select>
            </div>
          </div>

          {/* Concern */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Concern *
            </label>
            <textarea
              value={form.concern}
              onChange={(e) => set("concern", e.target.value)}
              rows={3}
              placeholder="Describe the IT concern in detail…"
              className="input resize-none"
              required
            />
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Assigned To
            </label>
            <select
              value={form.assignedTo}
              onChange={(e) => set("assignedTo", e.target.value)}
              className="input"
            >
              <option value="">Unassigned</option>
              <option>John Doe</option>
              <option>Alice M.</option>
              <option>Tom B.</option>
            </select>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Remarks
            </label>
            <textarea
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              rows={2}
              placeholder="Resolution notes or follow-up actions…"
              className="input resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                "Save Ticket"
              )}
            </button>
            <Link href="/tickets" className="btn-outline">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
