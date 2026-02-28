import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const list = await prisma.department.findMany({
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true },
    });
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    console.error("[Departments GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
