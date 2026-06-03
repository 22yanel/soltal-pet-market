import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isAdminPage =
    pathname.startsWith("/admin") && pathname !== "/admin/login";

  const isProductsApi = pathname.startsWith("/api/products");

  const isAdminApi =
    pathname.startsWith("/api/admin") && pathname !== "/api/admin/login";

  if (!isAdminPage && !isProductsApi && !isAdminApi) {
    return NextResponse.next();
  }

  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const sessionCookie = request.cookies.get("admin_session")?.value;

  const isAuthenticated = sessionSecret && sessionCookie === sessionSecret;

  if (isAuthenticated) {
    return NextResponse.next();
  }

  if (isProductsApi || isAdminApi) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/products/:path*", "/api/admin/:path*"],
};
