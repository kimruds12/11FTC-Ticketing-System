"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DEPARTMENTS = [
  "Sales",
  "Accounting",
  "CED",
  "HR",
  "Digitech & IT",
  "Digital",
  "Executives",
  "LASER/BODOR",
  "Painting",
  "Design",
  "Finishing",
  "Purchasing",
  "1sari",
  "Whole office",
  "Logistics-cubicle 1",
  "IT",
  "Maintenance",
  "Tooling",
  "Warehouse",
  "Cubicle 4",
  "Multimedia",
  "Gate2",
];

const MAIN_ISSUES = [
  "Network",
  "Printer",
  "Hardware",
  "Software",
  "Email",
  "ERP",
  "Account/Login",
  "Other",
];

const ASSIGNED_TO = [
  "Patrick",
  "Kim",
  "Paul",
  "Philip",
  "Kim/Paul",
  "Kim/Philip",
  "Paul/Philip",
  "IT Team",
];

export default function CreateTicketPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState("");
  const [employeeError, setEmployeeError] = useState("");
  const [department, setDepartment] = useState("IT");
  const [mainIssue, setMainIssue] = useState("Network");
  const [concern, setConcern] = useState("");
  const [concernError, setConcernError] = useState("");
  const [assignedTo, setAssignedTo] = useState("IT Team");
  const [status, setStatus] = useState("OPEN");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  // Validate Employee (pure text, no numbers/symbols)
  const handleEmployeeChange = (val: string) => {
    setEmployee(val);
    if (val && !/^[A-Za-z\s]+$/.test(val)) {
      setEmployeeError("Employee name must contain letters and spaces only.");
    } else {
      setEmployeeError("");
    }
  };

  // Validate Concern (alphanumeric, spaces, common punctuation)
  const handleConcernChange = (val: string) => {
    setConcern(val);
    if (val && !/^[A-Za-z0-9\s.,!?-]+$/.test(val)) {
      setConcernError("Concern must be a valid alphanumeric text combination.");
    } else {
      setConcernError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Re-verify validations
    if (!employee || !/^[A-Za-z\s]+$/.test(employee)) {
      setEmployeeError("Please enter a valid employee name (letters and spaces only).");
      return;
    }
    if (!concern || !/^[A-Za-z0-9\s.,!?-]+$/.test(concern)) {
      setConcernError("Please enter a valid concern (alphanumeric text).");
      return;
    }

    setLoading(true);
    // Simulate encoding API transaction delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoading(false);
    router.push("/tickets");
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] z-[9999] flex items-center justify-center p-4 animate-fade-in">
      {/* Centered Modal Card Focus */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 md:p-8 animate-scale-in">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Ticket</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider">
              IT Ticketing Operations
            </p>
          </div>
          <Link
            href="/tickets"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Cancel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Name */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Employee Name
            </label>
            <input
              type="text"
              required
              value={employee}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className={`input w-full ${employeeError ? "border-red-500 focus:ring-red-200" : ""}`}
            />
            {employeeError && (
              <p className="text-[10px] text-red-600 font-bold mt-1.5">{employeeError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input bg-gray-50 cursor-pointer font-semibold text-sm text-gray-700 w-full"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Main Issue */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Main Issue
              </label>
              <select
                value={mainIssue}
                onChange={(e) => setMainIssue(e.target.value)}
                className="input bg-gray-50 cursor-pointer font-semibold text-sm text-gray-700 w-full"
              >
                {MAIN_ISSUES.map((issue) => (
                  <option key={issue} value={issue}>
                    {issue}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Concern */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Concern
            </label>
            <textarea
              required
              rows={3}
              value={concern}
              onChange={(e) => handleConcernChange(e.target.value)}
              placeholder="Please describe the main issue or concern..."
              className={`input w-full resize-none ${concernError ? "border-red-500 focus:ring-red-200" : ""}`}
            />
            {concernError && (
              <p className="text-[10px] text-red-600 font-bold mt-1.5">{concernError}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Assigned to */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Assigned to
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="input bg-gray-50 cursor-pointer font-semibold text-sm text-gray-700 w-full"
              >
                {ASSIGNED_TO.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input bg-gray-50 cursor-pointer font-semibold text-sm text-gray-700 w-full"
              >
                <option value="OPEN">Open</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Remarks
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Scheduled post work hours"
              className="input w-full text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
            <Link
              href="/tickets"
              className="btn-outline font-bold text-xs py-2.5 px-4 text-gray-500 bg-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !!employeeError || !!concernError}
              className="btn-primary font-bold text-xs py-2.5 px-5 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
            >
              {loading ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
