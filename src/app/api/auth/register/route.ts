import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { setTokenCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { detectRoleFromEmail } from "@/lib/email-role";
import { Role } from "@prisma/client";

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

    const { email, password, name, phone, role: requestedRole, rollNumber, departmentId, clubId } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    const detection = detectRoleFromEmail(email);

    let finalRole: Role = "STUDENT";
    let finalRollNumber: string | undefined = rollNumber;
    let finalDepartmentId: string | undefined = departmentId;
    let finalClubId: string | undefined = clubId;
    let departmentStr: string | undefined;

    if (detection.role) {
      finalRole = detection.role as Role;
      if (detection.rollNumber) finalRollNumber = detection.rollNumber;

      if (detection.clubSlugHint && !finalClubId) {
        const club = await prisma.club.findFirst({
          where: { slug: { equals: detection.clubSlugHint, mode: "insensitive" } },
        });
        if (club) finalClubId = club.id;
      }

      if (detection.deptSlugHint && !finalDepartmentId) {
        const dept = await prisma.department.findFirst({
          where: { slug: { equals: detection.deptSlugHint, mode: "insensitive" } },
        });
        if (dept) {
          finalDepartmentId = dept.id;
          departmentStr = dept.name;
        }
      }
    } else if (requestedRole) {
      finalRole = requestedRole as Role;
    }

    if (finalRole === "STUDENT" && !finalRollNumber) {
      return NextResponse.json(
        { success: false, error: "Roll number is required for students" },
        { status: 400 }
      );
    }

    if (finalRole === "CLUB_ADMIN" && !finalClubId) {
      return NextResponse.json(
        { success: false, error: "Please select a club" },
        { status: 400 }
      );
    }

    if ((finalRole === "PROFESSOR" || finalRole === "DEPARTMENT_OFFICER") && !finalDepartmentId) {
      return NextResponse.json(
        { success: false, error: "Please select a department" },
        { status: 400 }
      );
    }

    if (finalDepartmentId && !departmentStr) {
      const dept = await prisma.department.findUnique({ where: { id: finalDepartmentId } });
      if (dept) departmentStr = dept.name;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: finalRole,
        rollNumber: finalRollNumber || null,
        departmentId: finalDepartmentId || null,
        clubId: finalClubId || null,
        department: departmentStr || null,
        phone: phone || null,
      },
      select: {
        id: true, email: true, name: true, role: true,
        rollNumber: true, department: true, departmentId: true, clubId: true,
        phone: true, createdAt: true, updatedAt: true,
      },
    });

    await createAuditLog({
      action: "USER_REGISTERED",
      entityType: "User",
      entityId: user.id,
      userId: user.id,
      metadata: { email, name, role: finalRole },
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
