import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { setTokenCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, department, phone } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, department, phone },
      select: {
        id: true, email: true, name: true, role: true,
        department: true, phone: true, createdAt: true, updatedAt: true,
      },
    });

    await createAuditLog({
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      userId: user.id,
      metadata: { email, name },
    });

    const token = await signToken({ userId: user.id, email: user.email, role: user.role });

    return NextResponse.json(
      { success: true, data: user, message: "Registration successful" },
      { status: 201, headers: setTokenCookie(token) }
    );
  } catch (error) {
    console.error("[Register]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
