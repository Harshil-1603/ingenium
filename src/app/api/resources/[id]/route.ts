import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateResourceSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import type { SafeUser } from "@/types";

function hasManagePermission(user: SafeUser, resource: { type?: string; ownerId: string | null; departmentId: string | null; clubId: string | null }): boolean {
  if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) return true;
  // LHC can edit room availability only
  if (user.role === "LHC") return resource.type === "ROOM";
  if (["CLUB_ADMIN", "CLUB_MANAGER"].includes(user.role)) return resource.clubId != null && user.clubId === resource.clubId;
  if (["DEPARTMENT_OFFICER", "LAB_TECH"].includes(user.role)) return resource.departmentId != null && user.departmentId === resource.departmentId;
  return false;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true, department: true },
        },
        _count: { select: { bookings: true } },
      },
    });

    if (!resource) {
      return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: resource });
  } catch (error) {
    console.error("[Resource GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const resource = await prisma.resource.findUnique({ where: { id }, select: { id: true, type: true, ownerId: true, departmentId: true, clubId: true } });
    if (!resource) {
      return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    }

    if (!hasManagePermission(user, resource)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateResourceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: parsed.data,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await createAuditLog({
      action: "RESOURCE_UPDATED",
      entityType: "Resource",
      entityId: id,
      userId: user.id,
      metadata: { changes: parsed.data },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Resource PUT]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const resource = await prisma.resource.findUnique({ where: { id }, select: { id: true, type: true, name: true, ownerId: true, departmentId: true, clubId: true } });
    if (!resource) {
      return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 });
    }

    if (!hasManagePermission(user, resource)) {
      return NextResponse.json({ success: false, error: "Insufficient permissions" }, { status: 403 });
    }

    await prisma.resource.update({ where: { id }, data: { isActive: false } });

    await createAuditLog({
      action: "RESOURCE_DELETED",
      entityType: "Resource",
      entityId: id,
      userId: user.id,
      metadata: { name: resource.name },
    });

    return NextResponse.json({ success: true, message: "Resource deactivated" });
  } catch (error) {
    console.error("[Resource DELETE]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
