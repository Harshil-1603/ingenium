import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateRoleSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Only Super Admins can change roles" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const previousRole = target.role;
    const updated = await prisma.user.update({
      where: { id },
      data: { role: parsed.data.role },
      select: {
        id: true, email: true, name: true, role: true,
        department: true, isActive: true,
      },
    });

    await createAuditLog({
      action: "USER_ROLE_CHANGED",
      entityType: "User",
      entityId: id,
      userId: user.id,
      metadata: { previousRole, newRole: parsed.data.role, targetUser: target.email },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Role Update]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
