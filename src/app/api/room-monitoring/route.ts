import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!["LHC", "SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const now = new Date();

    const rooms = await prisma.resource.findMany({
      where: { isActive: true, type: "ROOM" },
      include: {
        owner: { select: { id: true, name: true } },
        bookings: {
          where: {
            status: { in: ["APPROVED", "PENDING"] },
            endTime: { gte: now },
          },
          select: {
            id: true,
            title: true,
            status: true,
            startTime: true,
            endTime: true,
            user: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { startTime: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const summary = rooms.map((r) => {
      const activeBookings = r.bookings.filter(
        (b) => b.status === "APPROVED" && new Date(b.startTime) <= now && new Date(b.endTime) >= now
      );
      const pendingBookings = r.bookings.filter((b) => b.status === "PENDING");
      const upcomingBookings = r.bookings.filter(
        (b) => b.status === "APPROVED" && new Date(b.startTime) > now
      );

      let status: "OCCUPIED" | "ALLOCATED" | "FREE";
      if (activeBookings.length > 0) {
        status = "OCCUPIED";
      } else if (upcomingBookings.length > 0) {
        status = "ALLOCATED";
      } else {
        status = "FREE";
      }

      return {
        id: r.id,
        name: r.name,
        description: r.description,
        location: r.location,
        capacity: r.capacity,
        owner: r.owner,
        status,
        currentUser: activeBookings[0]?.user ?? null,
        currentBooking: activeBookings[0] ?? null,
        nextBooking: upcomingBookings[0] ?? null,
        activeBookings,
        pendingBookings,
        upcomingBookings,
        totalActiveAndUpcoming: activeBookings.length + upcomingBookings.length,
        totalPending: pendingBookings.length,
      };
    });

    const totalRooms = summary.length;
    const occupied = summary.filter((r) => r.status === "OCCUPIED").length;
    const allocated = summary.filter((r) => r.status === "ALLOCATED").length;
    const free = summary.filter((r) => r.status === "FREE").length;
    const totalPending = summary.reduce((sum, r) => sum + r.totalPending, 0);

    return NextResponse.json({
      success: true,
      data: {
        stats: { totalRooms, occupied, allocated, free, totalPending },
        rooms: summary,
      },
    });
  } catch (error) {
    console.error("[RoomMonitoring]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
