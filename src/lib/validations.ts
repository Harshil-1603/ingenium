import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  department: z.string().optional(),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createResourceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  type: z.enum(["ROOM", "EQUIPMENT", "ASSET"]),
  description: z.string().optional(),
  location: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  requiresApproval: z.boolean().optional(),
  maxBookingHours: z.number().int().min(1).max(24).optional(),
  minBookingHours: z.number().int().min(1).max(24).optional(),
  availableFrom: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  availableTo: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  availableDays: z.array(z.number().int().min(0).max(6)).optional(),
  ownerId: z.string().optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

export const createBookingSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  resourceId: z.string().min(1, "Resource is required"),
  startTime: z.string().datetime({ offset: true }).or(z.string().min(1)),
  endTime: z.string().datetime({ offset: true }).or(z.string().min(1)),
});

export const approvalSchema = z.object({
  comment: z.string().optional(),
});

export const updateRoleSchema = z.object({
  role: z.enum(["STUDENT", "CLUB_ADMIN", "DEPARTMENT_OFFICER", "SUPER_ADMIN"]),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type ApprovalInput = z.infer<typeof approvalSchema>;
