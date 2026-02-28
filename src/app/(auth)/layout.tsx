import Image from "next/image";
import { Grid3X3 } from "lucide-react";
import campusImage from "../../../abt us.png";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden">
        <Image
          src={campusImage}
          alt="IIT Jodhpur campus"
          fill
          className="absolute inset-0 h-full w-full object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/35" />

        <div className="relative max-w-md text-white space-y-10">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Grid3X3 className="h-10 w-10" />
              <span className="text-3xl font-bold">Campus Grid</span>
            </div>
            <h2 className="text-2xl font-semibold mb-4">Resource Governance System</h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              Manage room bookings and shared resources with transparency, fairness, and accountability.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                <div className="font-semibold">Real-time Calendar</div>
                <div className="text-blue-200 mt-1">Weekly availability view</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                <div className="font-semibold">Smart Waitlist</div>
                <div className="text-blue-200 mt-1">FCFS with auto-promotion</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                <div className="font-semibold">Approval Flow</div>
                <div className="text-blue-200 mt-1">Structured decisions</div>
              </div>
              <div className="rounded-lg bg-white/10 p-4 backdrop-blur-sm">
                <div className="font-semibold">Audit Logs</div>
                <div className="text-blue-200 mt-1">Full accountability</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
