import prisma from "./prisma";
import { createNotification } from "./notifications";
import { createAuditLog } from "./audit";
import { sendEmail, waitlistPromotedEmail } from "./email";

export async function getNextWaitlistPosition(resourceId: string, startTime: Date, endTime: Date): Promise<number> {
  const maxEntry = await prisma.waitlistEntry.findFirst({
    where: {
      resourceId,
      status: "WAITING",
      booking: {
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    },
    orderBy: { position: "desc" },
  });

  return (maxEntry?.position ?? 0) + 1;
}

export async function promoteNextInWaitlist(resourceId: string, startTime: Date, endTime: Date) {
  const nextEntry = await prisma.waitlistEntry.findFirst({
    where: {
      resourceId,
      status: "WAITING",
      booking: {
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    },
    orderBy: { position: "asc" },
    include: {
      booking: {
        include: {
          user: true,
          resource: true,
        },
      },
    },
  });

  if (!nextEntry) return null;

  const [updatedEntry] = await prisma.$transaction([
    prisma.waitlistEntry.update({
      where: { id: nextEntry.id },
      data: { status: "PROMOTED" },
    }),
    prisma.booking.update({
      where: { id: nextEntry.bookingId },
      data: { status: "PENDING" },
    }),
  ]);

  await createAuditLog({
    action: "WAITLIST_PROMOTED",
    entityType: "Booking",
    entityId: nextEntry.bookingId,
    userId: nextEntry.userId,
    metadata: {
      resourceId,
      position: nextEntry.position,
    },
  });

  await createNotification({
    userId: nextEntry.userId,
    type: "WAITLIST_PROMOTED",
    title: "Waitlist Promotion",
    message: `Your booking "${nextEntry.booking.title}" has been promoted from the waitlist.`,
    metadata: { bookingId: nextEntry.bookingId },
  });

  const emailData = waitlistPromotedEmail(
    nextEntry.booking.user.name,
    nextEntry.booking.title,
    nextEntry.booking.resource.name
  );
  sendEmail({ to: nextEntry.booking.user.email, ...emailData }).catch(() => {});

  return updatedEntry;
}
