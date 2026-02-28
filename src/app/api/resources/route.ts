import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createResourceSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { paginate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 20));
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const departmentId = searchParams.get("departmentId");
    const clubId = searchParams.get("clubId");

    const where: Record<string, unknown> = { isActive: true };
    if (type) where.type = type;

    if (user.role === "PROFESSOR") {
      // Professors see dept resources only (no club-only resources), rooms are unrestricted
      if (!type || type !== "ROOM") {
        where.departmentId = { not: null };
        where.clubId = null;
      }
    } else if (["LAB_TECH", "DEPARTMENT_OFFICER"].includes(user.role)) {
      // Lab Tech / Dept Officer see only their own department's resources
      where.departmentId = user.departmentId ?? "__none__";
      where.clubId = null;
    } else {
      if (departmentId) where.departmentId = departmentId;
      if (clubId) where.clubId = clubId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
      ];
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        include: {
          owner: {
            select: { id: true, name: true, email: true, role: true, department: true },
          },
          department: { select: { id: true, slug: true, name: true } },
          club: { select: { id: true, slug: true, name: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { name: "asc" },
        ...paginate(page, pageSize),
      }),
      prisma.resource.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: resources,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[Resources GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!["DEPARTMENT_OFFICER", "LAB_TECH", "CLUB_ADMIN", "CLUB_MANAGER", "SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createResourceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = { ...parsed.data };
    if (data.departmentId === undefined && ["DEPARTMENT_OFFICER", "LAB_TECH"].includes(user.role) && user.departmentId) {
      data.departmentId = user.departmentId;
    }
    if (data.clubId === undefined && ["CLUB_ADMIN", "CLUB_MANAGER"].includes(user.role) && user.clubId) {
      data.clubId = user.clubId;
    }

    const resource = await prisma.resource.create({
      data: {
        ...data,
        ownerId: data.ownerId || user.id,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true },
        },
        department: { select: { id: true, slug: true, name: true } },
        club: { select: { id: true, slug: true, name: true } },
      },
    });

    await createAuditLog({
      action: "RESOURCE_CREATED",
      entityType: "Resource",
      entityId: resource.id,
      userId: user.id,
      metadata: { name: resource.name, type: resource.type },
    });

    return NextResponse.json({ success: true, data: resource }, { status: 201 });
  } catch (error) {
    console.error("[Resources POST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
