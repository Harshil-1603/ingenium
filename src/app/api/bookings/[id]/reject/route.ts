import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser, canApproveBooking } from "@/lib/auth";
import { approvalSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendEmail, bookingRejectedEmail } from "@/lib/email";
import { promoteNextInWaitlist } from "@/lib/waitlist";

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
        { success: false, error: "Only pending bookings can be rejected" },
        { status: 400 }
      );
    }

    if (!canApproveBooking(user.role, booking.resource.ownerId, user.id)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: "REJECTED",
        approvedById: user.id,
        approvalComment: comment,
      },
      include: {
        resource: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await createAuditLog({
      action: "BOOKING_REJECTED",
      entityType: "Booking",
      entityId: id,
      userId: user.id,
      metadata: { comment, rejectedBy: user.name },
    });

    await createNotification({
      userId: booking.userId,
      type: "BOOKING_REJECTED",
      title: "Booking Rejected",
      message: `Your booking "${booking.title}" for "${booking.resource.name}" has been rejected.${comment ? ` Reason: ${comment}` : ""}`,
      metadata: { bookingId: id },
    });

    const emailData = bookingRejectedEmail(
      booking.user.name, booking.title, booking.resource.name, comment
    );
    sendEmail({ to: booking.user.email, ...emailData }).catch(() => {});

    await promoteNextInWaitlist(booking.resourceId, booking.startTime, booking.endTime);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Reject]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
