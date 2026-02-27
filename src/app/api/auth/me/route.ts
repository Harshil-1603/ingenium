import { NextResponse } from "next/server";
import { getCurrentUser, clearTokenCookie } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }
    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    { success: true, message: "Logged out" },
    { headers: clearTokenCookie() }
  );
}
