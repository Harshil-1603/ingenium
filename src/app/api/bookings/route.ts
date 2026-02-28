import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createBookingSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendEmail, bookingConfirmationEmail } from "@/lib/email";
import { canBookRoom, canBookResource } from "@/lib/rbac";
import { formatDateTime, paginate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const status = searchParams.get("status");
    const resourceId = searchParams.get("resourceId");
    const scope = searchParams.get("scope") || "own";

    const where: Record<string, unknown> = {};

    if (scope === "own" && !["SUPER_ADMIN", "ADMIN", "DEPARTMENT_OFFICER", "LAB_TECH", "LHC"].includes(user.role)) {
      where.userId = user.id;
    } else if (scope === "own") {
      where.userId = user.id;
    }

    if (scope === "pending-approval") {
      where.status = "PENDING";
      if (["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
        // see all
      } else if (user.role === "LHC") {
        where.resource = { type: "ROOM" };
      } else if (["CLUB_ADMIN", "CLUB_MANAGER"].includes(user.role) && user.clubId) {
        where.resource = { clubId: user.clubId };
      } else if (["DEPARTMENT_OFFICER", "LAB_TECH"].includes(user.role) && user.departmentId) {
        where.resource = { departmentId: user.departmentId };
      } else {
        return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
      }
    }

    if (status && scope !== "pending-approval") where.status = status;
    if (resourceId) where.resourceId = resourceId;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          resource: true,
          user: {
            select: { id: true, name: true, email: true, role: true, department: true },
          },
          approvedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          waitlistEntry: true,
        },
        orderBy: { createdAt: "desc" },
        ...paginate(page, pageSize),
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: bookings,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[Bookings GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { title, description, resourceId, startTime, endTime } = parsed.data;

    // Parse local-time datetime strings (no UTC conversion) so day-of-week validation is correct
    const parseLocal = (s: string) => {
      if (s.includes("Z") || /[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
      const [datePart, timePart] = s.split("T");
      const [y, mo, d] = datePart.split("-").map(Number);
      if (!timePart) return new Date(y, mo - 1, d, 0, 0, 0);
      const [h, mi, sec] = timePart.split(":").map(Number);
      return new Date(y, mo - 1, d, h, mi, sec ?? 0);
    };

    const start = parseLocal(startTime);
    const end = parseLocal(endTime);

    if (start >= end) {
      return NextResponse.json(
        { success: false, error: "End time must be after start time" },
        { status: 400 }
      );
    }

    if (start < new Date()) {
      return NextResponse.json(
        { success: false, error: "Cannot book in the past" },
        { status: 400 }
      );
    }

    const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
    if (!resource || !resource.isActive) {
      return NextResponse.json(
        { success: false, error: "Resource not found or inactive" },
        { status: 404 }
      );
    }

    if (resource.type === "ROOM") {
      if (!canBookRoom(user)) {
        return NextResponse.json(
          { success: false, error: "Only Professors, Club managers, and Department officers can book rooms. Students and LHC cannot book rooms." },
          { status: 403 }
        );
      }
    } else {
      if (!canBookResource(
        { role: user.role, departmentId: user.departmentId ?? null, clubId: user.clubId ?? null },
        { type: resource.type, departmentId: resource.departmentId ?? null, clubId: resource.clubId ?? null }
      )) {
        return NextResponse.json(
          { success: false, error: "You do not have permission to book this resource. Professors can only book department resources; students can book club and department resources." },
          { status: 403 }
        );
      }
    }

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours < resource.minBookingHours) {
      return NextResponse.json(
        { success: false, error: `Minimum booking duration is ${resource.minBookingHours} hour(s)` },
        { status: 400 }
      );
    }

    // Use the local date extracted from the ISO string to avoid UTC timezone day-shift
    const localDateStr = startTime.includes("T") ? startTime.split("T")[0] : startTime;
    const [y, m, d] = localDateStr.split("-").map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    if (resource.availableDays.length > 0 && !resource.availableDays.includes(dayOfWeek)) {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const allowed = resource.availableDays.map((d: number) => dayNames[d]).join(", ");
      return NextResponse.json(
        { success: false, error: `This resource is only available on: ${allowed}` },
        { status: 400 }
      );
    }

    const overlappingCount = await prisma.booking.count({
      where: {
        resourceId,
        status: { in: ["PENDING", "APPROVED"] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    const maxCount = resource.maxCount ?? 1;

    if (overlappingCount >= maxCount) {
      return NextResponse.json(
        { success: false, error: `Resource not available for this time slot. All ${maxCount} unit(s) are already booked.` },
        { status: 409 }
      );
    }

    const bookingStatus: "PENDING" | "APPROVED" = resource.requiresApproval ? "PENDING" : "APPROVED";

    const booking = await prisma.booking.create({
      data: {
        title,
        description,
        startTime: start,
        endTime: end,
        status: bookingStatus,
        resourceId,
        userId: user.id,
      },
      include: {
        resource: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await createAuditLog({
      action: "BOOKING_CREATED",
      entityType: "Booking",
      entityId: booking.id,
      userId: user.id,
      metadata: { title, resourceId, startTime, endTime, status: bookingStatus },
    });

    await createNotification({
      userId: user.id,
      type: "BOOKING_CREATED",
      title: bookingStatus === "APPROVED" ? "Booking Confirmed" : "Booking Submitted",
      message: bookingStatus === "APPROVED"
        ? `Your booking "${title}" for "${resource.name}" has been automatically confirmed.`
        : `Your booking "${title}" is pending approval.`,
      metadata: { bookingId: booking.id },
    });

    if (resource.ownerId && bookingStatus === "PENDING") {
      await createNotification({
        userId: resource.ownerId,
        type: "APPROVAL_REQUIRED",
        title: "New Booking Request",
        message: `${user.name} has requested to book "${resource.name}" — "${title}".`,
        metadata: { bookingId: booking.id },
      });
    }

    const emailData = bookingConfirmationEmail(
      user.name, title, resource.name,
      formatDateTime(start), formatDateTime(end)
    );
    sendEmail({ to: user.email, ...emailData }).catch(() => {});

    return NextResponse.json(
      { success: true, data: booking },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Bookings POST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
