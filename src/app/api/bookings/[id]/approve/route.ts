import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canApproveResource } from "@/lib/rbac";
import { approvalSchema } from "@/lib/validations";
import { logAction } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import { sendEmail, bookingApprovedEmail } from "@/lib/email";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const parsed = approvalSchema.safeParse(body);
    const comment = parsed.success ? parsed.data.comment : undefined;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        resource: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    if (booking.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Only pending bookings can be approved" },
        { status: 400 }
      );
    }

    if (!canApproveResource(
      { role: user.role, id: user.id, departmentId: user.departmentId ?? null, clubId: user.clubId ?? null },
      { type: booking.resource.type, ownerId: booking.resource.ownerId, departmentId: booking.resource.departmentId ?? null, clubId: booking.resource.clubId ?? null }
    )) {
      return NextResponse.json({ success: false, error: "Insufficient permissions to approve this booking" }, { status: 403 });
    }

    const previousStatus = booking.status;
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: user.id,
        approvalComment: comment,
      },
      include: {
        resource: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await logAction({
      userId: user.id,
      action: "BOOKING_APPROVED",
      entityType: "Booking",
      entityId: id,
      oldState: previousStatus,
      newState: "APPROVED",
      metadata: { comment, approvedBy: user.name },
    });

    await createNotification({
      userId: booking.userId,
      type: "BOOKING_APPROVED",
      title: "Booking Approved",
      message: `Your booking "${booking.title}" for "${booking.resource.name}" has been approved.`,
      metadata: { bookingId: id },
    });

    const emailData = bookingApprovedEmail(
      booking.user.name, booking.title, booking.resource.name, comment
    );
    sendEmail({ to: booking.user.email, ...emailData }).catch(() => {});

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Approve]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
