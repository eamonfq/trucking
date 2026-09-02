import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isClientRoute = request.nextUrl.pathname.startsWith("/cliente");

  if (!session || (isAdminRoute && session.role !== "admin") || (isClientRoute && session.role !== "cliente")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("siguiente", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/cliente/:path*", "/admin/:path*"],
};
