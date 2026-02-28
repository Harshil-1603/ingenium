export function cn(...inputs: string[]): string {
  return inputs.filter(Boolean).join(" ");
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay() + 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function generateTimeSlots(from: string, to: string, intervalMinutes: number = 60): string[] {
  const slots: string[] = [];
  const [fromH, fromM] = from.split(":").map(Number);
  const [toH, toM] = to.split(":").map(Number);

  let current = fromH * 60 + fromM;
  const end = toH * 60 + toM;

  while (current < end) {
    const h = Math.floor(current / 60);
    const m = current % 60;
    slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    current += intervalMinutes;
  }

  return slots;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
    WAITLISTED: "bg-purple-100 text-purple-800",
    OVERRIDDEN: "bg-orange-100 text-orange-800",
    WAITING: "bg-purple-100 text-purple-800",
    PROMOTED: "bg-blue-100 text-blue-800",
    EXPIRED: "bg-gray-100 text-gray-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    STUDENT: "bg-blue-100 text-blue-800",
    PROFESSOR: "bg-sky-100 text-sky-800",
    CLUB_ADMIN: "bg-indigo-100 text-indigo-800",
    CLUB_MANAGER: "bg-indigo-100 text-indigo-800",
    DEPARTMENT_OFFICER: "bg-emerald-100 text-emerald-800",
    LAB_TECH: "bg-teal-100 text-teal-800",
    LHC: "bg-amber-100 text-amber-800",
    SUPER_ADMIN: "bg-red-100 text-red-800",
    ADMIN: "bg-red-100 text-red-800",
  };
  return colors[role] || "bg-gray-100 text-gray-800";
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    STUDENT: "Student",
    PROFESSOR: "Professor",
    CLUB_ADMIN: "Club Admin",
    CLUB_MANAGER: "Club Manager",
    DEPARTMENT_OFFICER: "Department Officer",
    LAB_TECH: "Lab Technician",
    LHC: "LHC",
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
  };
  return labels[role] || role;
}

export function getResourceTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ROOM: "Room",
    EQUIPMENT: "Equipment",
    ASSET: "Asset",
  };
  return labels[type] || type;
}

export function paginate(page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  return { skip, take: pageSize };
}
