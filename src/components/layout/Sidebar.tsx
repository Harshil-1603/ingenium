"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Box,
  ClipboardCheck,
  ScrollText,
  Users,
  Settings,
  LogOut,
  Grid3X3,
} from "lucide-react";

interface SidebarProps {
  userRole: string;
  onLogout: () => void;
}

export function Sidebar({ userRole, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["STUDENT", "CLUB_ADMIN", "DEPARTMENT_OFFICER", "SUPER_ADMIN"] },
    { name: "Calendar", href: "/calendar", icon: Calendar, roles: ["STUDENT", "CLUB_ADMIN", "DEPARTMENT_OFFICER", "SUPER_ADMIN"] },
    { name: "My Bookings", href: "/bookings", icon: BookOpen, roles: ["STUDENT", "CLUB_ADMIN", "DEPARTMENT_OFFICER", "SUPER_ADMIN"] },
    { name: "Resources", href: "/resources", icon: Box, roles: ["STUDENT", "CLUB_ADMIN", "DEPARTMENT_OFFICER", "SUPER_ADMIN"] },
    { name: "Approvals", href: "/approvals", icon: ClipboardCheck, roles: ["CLUB_ADMIN", "DEPARTMENT_OFFICER", "SUPER_ADMIN"] },
    { name: "Audit Logs", href: "/audit", icon: ScrollText, roles: ["DEPARTMENT_OFFICER", "SUPER_ADMIN"] },
    { name: "Manage Users", href: "/admin/users", icon: Users, roles: ["SUPER_ADMIN"] },
  ];

  const filteredNav = navigation.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <Grid3X3 className="h-7 w-7 text-brand-600" />
        <span className="text-xl font-bold text-gray-900">Campus Grid</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-brand-600" : "text-gray-400"}`} />
              {item.name}
            </Link>
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
