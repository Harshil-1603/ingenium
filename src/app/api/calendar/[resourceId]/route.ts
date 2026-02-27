import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getWeekBounds } from "@/lib/utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ resourceId: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { resourceId } = await params;
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");
    const date = dateStr ? new Date(dateStr) : new Date();
    const { start, end } = getWeekBounds(date);

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { id: true, name: true, availableFrom: true, availableTo: true, availableDays: true },
    });

    if (!resource) {
      return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        resourceId,
        status: { in: ["PENDING", "APPROVED"] },
        startTime: { gte: start },
        endTime: { lte: end },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
    });

    const slots = bookings.map((b) => ({
      id: b.id,
      title: b.title,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      status: b.status,
      userId: b.user.id,
      userName: b.user.name,
    }));

    return NextResponse.json({
      success: true,
      data: {
        resourceId: resource.id,
        resourceName: resource.name,
        weekStart: start.toISOString(),
        weekEnd: end.toISOString(),
        availableFrom: resource.availableFrom,
        availableTo: resource.availableTo,
        availableDays: resource.availableDays,
        slots,
      },
    });
  } catch (error) {
    console.error("[Calendar]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
