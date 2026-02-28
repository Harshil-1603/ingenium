import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/jwt";

function isPublic(pathname: string): boolean {
  if (pathname === "/" || pathname === "/login" || pathname === "/register") return true;
  if (pathname === "/api/auth/login" || pathname === "/api/auth/register") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/favicon")) return true;
  if (pathname.endsWith(".ico") || pathname.endsWith(".png") || pathname.endsWith(".svg")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("campus-grid-token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const payload = await verifyToken(token);
    if (!payload) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("campus-grid-token");
      return response;
    }

    const headers = new Headers(request.headers);
    headers.set("x-user-id", payload.userId);
    headers.set("x-user-email", payload.email);
    headers.set("x-user-role", payload.role);

    return NextResponse.next({ request: { headers } });
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ success: false, error: "Auth error" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("campus-grid-token");
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
