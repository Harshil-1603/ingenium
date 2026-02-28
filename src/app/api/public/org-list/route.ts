import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [departments, clubs] = await Promise.all([
      prisma.department.findMany({ orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } }),
      prisma.club.findMany({ orderBy: { name: "asc" }, select: { id: true, slug: true, name: true } }),
    ]);
    return NextResponse.json({ success: true, data: { departments, clubs } });
  } catch (error) {
    console.error("[Public org-list]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
