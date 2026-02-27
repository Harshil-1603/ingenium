"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Eye, EyeOff } from "lucide-react";
import { toast } from "@/components/ui/Toaster";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", department: "", phone: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
          <input id="email" type="email" required value={form.email} onChange={(e) => updateField("email", e.target.value)} className="input-field" placeholder="you@university.edu" />
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1.5">Department</label>
            <input id="department" type="text" value={form.department} onChange={(e) => updateField("department", e.target.value)} className="input-field" placeholder="Optional" />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
            <input id="phone" type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="input-field" placeholder="Optional" />
          </div>
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
