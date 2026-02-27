import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { promoteNextInWaitlist } from "@/lib/waitlist";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { resource: true, waitlistEntry: true },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    if (booking.userId !== user.id && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    if (["CANCELLED", "REJECTED"].includes(booking.status)) {
      return NextResponse.json(
        { success: false, error: "Booking is already cancelled or rejected" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
      }),
      ...(booking.waitlistEntry
        ? [prisma.waitlistEntry.update({
            where: { id: booking.waitlistEntry.id },
            data: { status: "CANCELLED" },
          })]
        : []),
    ]);

    await createAuditLog({
      action: "BOOKING_CANCELLED",
      entityType: "Booking",
      entityId: id,
      userId: user.id,
      metadata: { title: booking.title, previousStatus: booking.status },
    });

    await createNotification({
      userId: booking.userId,
      type: "BOOKING_CANCELLED",
      title: "Booking Cancelled",
      message: `Your booking "${booking.title}" has been cancelled.`,
      metadata: { bookingId: id },
    });

    if (["PENDING", "APPROVED"].includes(booking.status)) {
      await promoteNextInWaitlist(booking.resourceId, booking.startTime, booking.endTime);
    }

    return NextResponse.json({ success: true, message: "Booking cancelled" });
  } catch (error) {
    console.error("[Cancel]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
