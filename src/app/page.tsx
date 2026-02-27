import Link from "next/link";
import { Grid3X3, Calendar, ShieldCheck, BookOpen, ClipboardCheck, ScrollText } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Grid3X3 className="h-7 w-7 text-brand-600" />
          <span className="text-xl font-bold text-gray-900">Campus Grid</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost">Sign In</Link>
          <Link href="/register" className="btn-primary">Get Started</Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700 mb-6">
            <ShieldCheck className="h-4 w-4" />
            Resource Governance System
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            Manage campus resources{" "}
            <span className="bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
              transparently
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 leading-8 max-w-2xl mx-auto">
            A centralized platform for managing room bookings and shared resources with
            real-time visibility, deterministic waitlists, and complete audit logging.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-base px-8 py-3">
              Create Account
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3">
              Sign In
            </Link>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: Calendar,
              title: "Weekly Calendar View",
              desc: "Real-time availability with a transparent weekly layout. See all pending and approved bookings at a glance.",
            },
            {
              icon: BookOpen,
              title: "Smart Booking System",
              desc: "Deterministic waitlist mechanism with first-come-first-serve fairness and automatic slot promotion.",
            },
            {
              icon: ClipboardCheck,
              title: "Approval Workflow",
              desc: "Routed requests to designated authorities with approve/reject actions and status tracking.",
            },
            {
              icon: ShieldCheck,
              title: "Role-Based Access",
              desc: "Multiple terminals for Students, Club Admins, Department Officers, and Super Admins.",
            },
            {
              icon: ScrollText,
              title: "Audit Logging",
              desc: "Immutable log for every booking creation, approval, rejection, and cancellation.",
            },
            {
              icon: Grid3X3,
              title: "Resource Registry",
              desc: "Create and manage rooms, equipment, and assets with booking constraints and ownership.",
            },
          ].map((feature) => (
            <div key={feature.title} className="card hover:shadow-md transition-shadow">
              <div className="mb-4 inline-flex rounded-lg bg-brand-50 p-3">
                <feature.icon className="h-6 w-6 text-brand-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-gray-500">
          Campus Grid — Resource Governance System
        </div>
      </footer>
    </div>
  );
}
