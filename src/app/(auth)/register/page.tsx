"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Eye, EyeOff, Info, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/ui/Toaster";
import { detectRoleFromEmail, getRoleLabel, type EmailDetection } from "@/lib/email-role";

interface Org { id: string; slug: string; name: string }

const SELECTABLE_ROLES = ["STUDENT", "PROFESSOR", "CLUB_ADMIN"] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    role: "" as string,
    rollNumber: "",
    clubId: "",
    departmentId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Org[]>([]);
  const [clubs, setClubs] = useState<Org[]>([]);
  const [detection, setDetection] = useState<EmailDetection | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);

  useEffect(() => {
    fetch("/api/public/org-list")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setDepartments(d.data.departments);
          setClubs(d.data.clubs);
        }
      })
      .catch(() => {});
  }, []);

  const handleEmailChange = useCallback((email: string) => {
    setForm((prev) => ({ ...prev, email }));

    const det = detectRoleFromEmail(email);
    setDetection(det);

    if (det.role) {
      setAutoDetected(true);
      setForm((prev) => ({
        ...prev,
        email,
        role: det.role!,
        rollNumber: det.rollNumber || "",
      }));
    } else {
      setAutoDetected(false);
    }
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "role") {
      setAutoDetected(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.role) {
      toast("error", "Please select your role or enter an @iitj.ac.in email for auto-detection.");
      return;
    }
    if (form.role === "CLUB_ADMIN" && !form.clubId) {
      toast("error", "Please select your club.");
      return;
    }
    if (form.role === "PROFESSOR" && !form.departmentId) {
      toast("error", "Please select your department.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          role: form.role,
          rollNumber: form.rollNumber || undefined,
          clubId: form.clubId || undefined,
          departmentId: form.departmentId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast("success", "Account created successfully!");
        router.push("/dashboard");
      } else {
        toast("error", data.error || "Registration failed");
      }
    } catch {
      toast("error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const showRoleSelector = !autoDetected;
  const showClubSelect = form.role === "CLUB_ADMIN";
  const showDeptSelect = form.role === "PROFESSOR" || form.role === "DEPARTMENT_OFFICER";

  return (
    <div>
      <div className="lg:hidden flex items-center gap-2 mb-8">
        <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <UserPlus className="h-4 w-4 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">Campus Grid</span>
      </div>

      <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
      <p className="mt-2 text-sm text-gray-600">Join Campus Grid to manage resource bookings</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
          <input id="name" type="text" required value={form.name} onChange={(e) => updateField("name", e.target.value)} className="input-field" placeholder="John Doe" />
        </div>

        {/* Email with auto-detect */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Institute email</label>
          <input
            id="email" type="email" required value={form.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            className="input-field"
            placeholder="you@iitj.ac.in"
          />
          {detection && detection.isIITJ && detection.role && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="text-green-700">
                Auto-detected as <strong>{getRoleLabel(detection.role)}</strong>
                {detection.rollNumber && <> &middot; Roll: <strong>{detection.rollNumber}</strong></>}
              </span>
            </div>
          )}
          {form.email && !detection?.isIITJ && form.email.includes("@") && (
            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-600">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Non-IITJ email detected. Please select your role manually below.</span>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
          <div className="relative">
            <input id="password" type={showPassword ? "text" : "password"} required minLength={8} value={form.password} onChange={(e) => updateField("password", e.target.value)} className="input-field pr-10" placeholder="Min 8 characters" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Role selector — shown when email doesn't auto-detect */}
        {showRoleSelector && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">I am a...</label>
            <div className="grid grid-cols-3 gap-2">
              {SELECTABLE_ROLES.map((r) => (
                <button
                  key={r} type="button"
                  onClick={() => updateField("role", r)}
                  className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                    form.role === r
                      ? "border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {getRoleLabel(r)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Auto-detected role chip (editable) */}
        {autoDetected && detection?.role && (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
            <div className="text-sm">
              <span className="text-green-800 font-medium">{getRoleLabel(detection.role)}</span>
              <span className="text-green-600 text-xs ml-2">(auto-detected)</span>
            </div>
            <button type="button" onClick={() => { setAutoDetected(false); }} className="text-xs text-green-700 underline hover:text-green-900">
              Change
            </button>
          </div>
        )}

        {/* Student roll number (auto-filled for IITJ students, editable for others) */}
        {form.role === "STUDENT" && (
          <div>
            <label htmlFor="rollNumber" className="block text-sm font-medium text-gray-700 mb-1.5">Roll Number</label>
            <input
              id="rollNumber" type="text" value={form.rollNumber}
              onChange={(e) => updateField("rollNumber", e.target.value.toUpperCase())}
              className="input-field" placeholder="e.g. B24CI1010"
              required
            />
          </div>
        )}

        {/* Club selector */}
        {showClubSelect && (
          <div>
            <label htmlFor="clubId" className="block text-sm font-medium text-gray-700 mb-1.5">Club</label>
            <select id="clubId" required value={form.clubId} onChange={(e) => updateField("clubId", e.target.value)} className="input-field">
              <option value="">Select your club</option>
              {clubs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {/* Department selector */}
        {showDeptSelect && (
          <div>
            <label htmlFor="departmentId" className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
            <select id="departmentId" required value={form.departmentId} onChange={(e) => updateField("departmentId", e.target.value)} className="input-field">
              <option value="">Select your department</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-gray-400">(optional)</span></label>
          <input id="phone" type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="input-field" placeholder="+91 98765 43210" />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-500">
          Sign in
        </Link>
      </p>
    </div>
  );
}
