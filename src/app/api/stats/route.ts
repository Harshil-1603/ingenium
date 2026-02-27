import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = ["SUPER_ADMIN", "DEPARTMENT_OFFICER"].includes(user.role);

    const bookingWhere = isAdmin ? {} : { userId: user.id };

    const [
      totalBookings,
      pendingBookings,
      approvedBookings,
      totalResources,
      totalUsers,
      recentBookings,
    ] = await Promise.all([
      prisma.booking.count({ where: bookingWhere }),
      prisma.booking.count({ where: { ...bookingWhere, status: "PENDING" } }),
      prisma.booking.count({ where: { ...bookingWhere, status: "APPROVED" } }),
      prisma.resource.count({ where: { isActive: true } }),
      isAdmin ? prisma.user.count() : Promise.resolve(0),
      prisma.booking.findMany({
        where: bookingWhere,
        include: {
          resource: { select: { name: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalBookings,
        pendingBookings,
        approvedBookings,
        totalResources,
        totalUsers,
        recentBookings,
      },
    });
  } catch (error) {
    console.error("[Stats]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
