import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canReopenOrOverride } from "@/lib/rbac";
import { logAction } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import { promoteNextInWaitlist } from "@/lib/waitlist";
import { sendEmail, bookingCancelledEmail } from "@/lib/email";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { resource: true, waitlistEntry: true, user: { select: { id: true, name: true, email: true } } },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    const isOwner = booking.userId === user.id;
    const isAdmin = canReopenOrOverride(user);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    if (["CANCELLED", "REJECTED"].includes(booking.status)) {
      return NextResponse.json(
        { success: false, error: "Booking is already cancelled or rejected" },
        { status: 400 }
      );
    }

    const previousStatus = booking.status;
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

    await logAction({
      userId: user.id,
      action: "BOOKING_CANCELLED",
      entityType: "Booking",
      entityId: id,
      oldState: previousStatus,
      newState: "CANCELLED",
      metadata: { title: booking.title },
    });

    await createNotification({
      userId: booking.userId,
      type: "BOOKING_CANCELLED",
      title: "Booking Cancelled",
      message: `Your booking "${booking.title}" has been cancelled.`,
      metadata: { bookingId: id },
    });

    const emailData = bookingCancelledEmail(booking.user.name, booking.title, booking.resource.name);
    sendEmail({ to: booking.user.email, ...emailData }).catch(() => {});

    if (["PENDING", "APPROVED"].includes(previousStatus)) {
      await promoteNextInWaitlist(booking.resourceId, booking.startTime, booking.endTime);
    }

    return NextResponse.json({ success: true, message: "Booking cancelled" });
  } catch (error) {
    console.error("[Cancel]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
