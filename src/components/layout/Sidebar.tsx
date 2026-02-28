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
  BarChart3,
  ClipboardCheck,
  ScrollText,
  Users,
  LogOut,
  Grid3X3,
} from "lucide-react";
import { hasAdminPanel } from "@/lib/rbac";

interface SidebarProps {
  userRole: string;
  onLogout: () => void;
}

interface NavSection {
  label?: string;
  items: { name: string; href: string; icon: React.ElementType; roles: string[] }[];
}

const CAN_VIEW_ROOMS = ["STUDENT", "PROFESSOR", "CLUB_ADMIN", "CLUB_MANAGER", "DEPARTMENT_OFFICER", "LAB_TECH", "LHC", "SUPER_ADMIN", "ADMIN"];
const CAN_BOOK_ROOMS = ["PROFESSOR", "CLUB_ADMIN", "CLUB_MANAGER", "DEPARTMENT_OFFICER", "LAB_TECH", "SUPER_ADMIN", "ADMIN"];
const CAN_USE_RESOURCES = ["STUDENT", "PROFESSOR", "CLUB_ADMIN", "CLUB_MANAGER", "SUPER_ADMIN", "ADMIN"];
const DEPT_ROLES = ["DEPARTMENT_OFFICER", "LAB_TECH"];
const ALL_ROLES = ["STUDENT", "PROFESSOR", "CLUB_ADMIN", "CLUB_MANAGER", "DEPARTMENT_OFFICER", "LAB_TECH", "LHC", "SUPER_ADMIN", "ADMIN"];

const sections: NavSection[] = [
  {
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
      { name: "Calendar", href: "/calendar", icon: Calendar, roles: ALL_ROLES },
    ],
  },
  {
    label: "Rooms",
    items: [
      { name: "Room Directory", href: "/rooms", icon: DoorOpen, roles: CAN_VIEW_ROOMS },
      { name: "Room Bookings", href: "/room-bookings", icon: BookOpen, roles: CAN_BOOK_ROOMS },
    ],
  },
  {
    label: "Resources",
    items: [
      { name: "Resource Directory", href: "/resources", icon: Box, roles: CAN_USE_RESOURCES },
      { name: "Resource Bookings", href: "/resource-bookings", icon: PackageSearch, roles: CAN_USE_RESOURCES },
    ],
  },
  {
    label: "LHC",
    items: [
      { name: "Room Monitoring", href: "/room-monitoring", icon: DoorOpen, roles: ["LHC"] },
    ],
  },
  {
    label: "Department",
    items: [
      { name: "Resource Monitoring", href: "/resource-monitoring", icon: BarChart3, roles: DEPT_ROLES },
    ],
  },
  {
    label: "Administration",
    items: [
      { name: "Approvals", href: "/approvals", icon: ClipboardCheck, roles: ["CLUB_ADMIN", "CLUB_MANAGER", "DEPARTMENT_OFFICER", "LAB_TECH", "LHC", "SUPER_ADMIN", "ADMIN"] },
      { name: "Audit Logs", href: "/audit", icon: ScrollText, roles: ["SUPER_ADMIN", "ADMIN"] },
      { name: "Manage Users", href: "/admin/users", icon: Users, roles: ["SUPER_ADMIN", "ADMIN"] },
    ],
  },
];

export function Sidebar({ userRole, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const showAdminPanel = hasAdminPanel({ role: userRole });

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <Grid3X3 className="h-7 w-7 text-brand-600" />
        <span className="text-xl font-bold text-gray-900">Campus Grid</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-5">
        {sections.map((section, si) => {
          if (section.label === "Administration" && !showAdminPanel) return null;
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
