import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startStr = searchParams.get("start");
    const endStr = searchParams.get("end");

    if (!startStr || !endStr) {
      return NextResponse.json(
        { success: false, error: "start and end query parameters are required" },
        { status: 400 }
      );
    }

    const dayStart = new Date(startStr);
    const dayEnd = new Date(endStr);

    if (isNaN(dayStart.getTime()) || isNaN(dayEnd.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format" },
        { status: 400 }
      );
    }

    const resources = await prisma.resource.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        capacity: true,
        availableFrom: true,
        availableTo: true,
        availableDays: true,
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ["PENDING", "APPROVED"] },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        resources,
        bookings: bookings.map((b) => ({
          id: b.id,
          title: b.title,
          startTime: b.startTime.toISOString(),
          endTime: b.endTime.toISOString(),
          status: b.status,
          resourceId: b.resourceId,
          userId: b.user.id,
          userName: b.user.name,
        })),
      },
    });
  } catch (error) {
    console.error("[Daily Calendar]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
