import type {
  User,
  Resource,
  Booking,
  WaitlistEntry,
  AuditLog,
  Notification,
  Role,
  ResourceType,
  BookingStatus,
  WaitlistStatus,
} from "@prisma/client";

export type {
  User,
  Resource,
  Booking,
  WaitlistEntry,
  AuditLog,
  Notification,
  Role,
  ResourceType,
  BookingStatus,
  WaitlistStatus,
};

export type SafeUser = Omit<User, "password">;

export type BookingWithRelations = Booking & {
  resource: Resource;
  user: SafeUser;
  approvedBy?: SafeUser | null;
  waitlistEntry?: WaitlistEntry | null;
};

export type ResourceWithOwner = Resource & {
  owner?: SafeUser | null;
  _count?: { bookings: number };
};

export type AuditLogWithUser = AuditLog & {
  user: SafeUser;
};

export type NotificationWithUser = Notification & {
  user: SafeUser;
};

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CalendarSlot {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  userId: string;
  userName: string;
}

export interface WeeklyCalendarData {
  resourceId: string;
  resourceName: string;
  weekStart: string;
  weekEnd: string;
  slots: CalendarSlot[];
}
