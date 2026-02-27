"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  DoorOpen,
  BookOpen,
  Box,
  PackageSearch,
  ClipboardCheck,
  ScrollText,
  Users,
  LogOut,
  Grid3X3,
} from "lucide-react";

interface SidebarProps {
  userRole: string;
  onLogout: () => void;
}

interface NavSection {
  label?: string;
  items: { name: string; href: string; icon: React.ElementType; roles: string[] }[];
}

const ALL_ROLES = ["STUDENT", "CLUB_ADMIN", "DEPARTMENT_OFFICER", "SUPER_ADMIN"];

const sections: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
    ],
  },
  {
    label: "Rooms",
    items: [
      { name: "Room Directory", href: "/rooms", icon: DoorOpen, roles: ALL_ROLES },
      { name: "Room Calendar", href: "/calendar", icon: Calendar, roles: ALL_ROLES },
      { name: "Room Bookings", href: "/room-bookings", icon: BookOpen, roles: ALL_ROLES },
    ],
  },
  {
    label: "Resources",
    items: [
      { name: "Resource Directory", href: "/resources", icon: Box, roles: ALL_ROLES },
      { name: "Resource Bookings", href: "/resource-bookings", icon: PackageSearch, roles: ALL_ROLES },
    ],
  },
  {
    label: "Administration",
    items: [
      { name: "Approvals", href: "/approvals", icon: ClipboardCheck, roles: ["CLUB_ADMIN", "DEPARTMENT_OFFICER", "SUPER_ADMIN"] },
      { name: "Audit Logs", href: "/audit", icon: ScrollText, roles: ["DEPARTMENT_OFFICER", "SUPER_ADMIN"] },
      { name: "Manage Users", href: "/admin/users", icon: Users, roles: ["SUPER_ADMIN"] },
    ],
  },
];

export function Sidebar({ userRole, onLogout }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <Grid3X3 className="h-7 w-7 text-brand-600" />
        <span className="text-xl font-bold text-gray-900">Campus Grid</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-5">
        {sections.map((section, si) => {
          const visibleItems = section.items.filter((item) => item.roles.includes(userRole));
          if (visibleItems.length === 0) return null;
          return (
            <div key={si}>
              {section.label && (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-50 text-brand-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <item.icon className={`h-4.5 w-4.5 ${isActive ? "text-brand-600" : "text-gray-400"}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <LogOut className="h-5 w-5 text-gray-400" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
