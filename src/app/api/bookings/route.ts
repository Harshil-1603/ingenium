import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createBookingSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendEmail, bookingConfirmationEmail } from "@/lib/email";
import { getNextWaitlistPosition } from "@/lib/waitlist";
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

    const { title, description, resourceId, startTime, endTime, rollNumber } = parsed.data;
    const start = new Date(startTime);
    const end = new Date(endTime);

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

    if (user.role === "STUDENT" && (!rollNumber || String(rollNumber).trim() === "")) {
      return NextResponse.json(
        { success: false, error: "Roll number is required when requesting as a student" },
        { status: 400 }
      );
    }

    if (user.role === "STUDENT" && rollNumber) {
      await prisma.user.update({
        where: { id: user.id },
        data: { rollNumber: String(rollNumber).trim() },
      });
    }

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    if (durationHours > resource.maxBookingHours) {
      return NextResponse.json(
        { success: false, error: `Maximum booking duration is ${resource.maxBookingHours} hours` },
        { status: 400 }
      );
    }
    if (durationHours < resource.minBookingHours) {
      return NextResponse.json(
        { success: false, error: `Minimum booking duration is ${resource.minBookingHours} hour(s)` },
        { status: 400 }
      );
    }

    const dayOfWeek = start.getDay();
    if (!resource.availableDays.includes(dayOfWeek)) {
      return NextResponse.json(
        { success: false, error: "Resource is not available on this day" },
        { status: 400 }
      );
    }

    const conflicting = await prisma.booking.findFirst({
      where: {
        resourceId,
        status: { in: ["PENDING", "APPROVED"] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });

    let bookingStatus: "PENDING" | "APPROVED" | "WAITLISTED" = resource.requiresApproval ? "PENDING" : "APPROVED";
    let waitlistEntry = null;

    if (conflicting) {
      bookingStatus = "WAITLISTED";
    }

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

    if (bookingStatus === "WAITLISTED") {
      const position = await getNextWaitlistPosition(resourceId, start, end);
      waitlistEntry = await prisma.waitlistEntry.create({
        data: {
          position,
          bookingId: booking.id,
          resourceId,
          userId: user.id,
        },
      });
    }

    const action = bookingStatus === "WAITLISTED" ? "BOOKING_WAITLISTED" : "BOOKING_CREATED";
    await createAuditLog({
      action,
      entityType: "Booking",
      entityId: booking.id,
      userId: user.id,
      metadata: { title, resourceId, startTime, endTime, status: bookingStatus },
    });

    await createNotification({
      userId: user.id,
      type: action,
      title: bookingStatus === "WAITLISTED" ? "Added to Waitlist" : bookingStatus === "APPROVED" ? "Booking Confirmed" : "Booking Submitted",
      message: bookingStatus === "WAITLISTED"
        ? `Your booking "${title}" has been waitlisted at position ${waitlistEntry?.position}.`
        : bookingStatus === "APPROVED"
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
      { success: true, data: { ...booking, waitlistEntry } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Bookings POST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
