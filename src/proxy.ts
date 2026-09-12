import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // The DAL and actions verify the database session; this check is optimistic.
  if (!request.cookies.get("ayl_session")?.value) {
    const url = new URL("/login", request.url);
    url.searchParams.set("siguiente", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/cliente/:path*", "/admin/:path*", "/almacen/:path*"],
};
