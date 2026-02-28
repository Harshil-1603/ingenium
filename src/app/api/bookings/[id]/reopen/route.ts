import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canReopenOrOverride } from "@/lib/rbac";
import { logAction } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!canReopenOrOverride(user)) {
      return NextResponse.json({ success: false, error: "Only Admin can reopen requests" }, { status: 403 });
    }

    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { resource: true, user: { select: { id: true, name: true, email: true } } },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    const allowedPrevious = ["REJECTED", "CANCELLED", "OVERRIDDEN"];
    if (!allowedPrevious.includes(booking.status)) {
      return NextResponse.json(
        { success: false, error: "Only rejected, cancelled, or overridden bookings can be reopened" },
        { status: 400 }
      );
    }

    const previousStatus = booking.status;
    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "PENDING", approvedById: null, approvalComment: null },
      include: { resource: true, user: { select: { id: true, name: true, email: true } } },
    });

    await logAction({
      userId: user.id,
      action: "BOOKING_REOPENED",
      entityType: "Booking",
      entityId: id,
      oldState: previousStatus,
      newState: "PENDING",
      metadata: { title: booking.title, adminId: user.id },
    });

    await createNotification({
      userId: booking.userId,
      type: "BOOKING_REOPENED",
      title: "Request Reopened",
      message: `Your booking "${booking.title}" has been reopened by Admin and is pending approval again.`,
      metadata: { bookingId: id },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Reopen]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
