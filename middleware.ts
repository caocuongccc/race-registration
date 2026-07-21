// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (pathname.startsWith("/admin/dashboard")) {
    if (!token) {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    if (token.role === "MEMBER") {
      if (pathname === "/admin/dashboard") {
        return NextResponse.redirect(
          new URL("/admin/dashboard/merch-campaigns", request.url),
        );
      }
      if (!pathname.startsWith("/admin/dashboard/merch-campaigns")) {
        return NextResponse.redirect(new URL("/member", request.url));
      }
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/mobile")) {
    if (!token) {
      const url = new URL("/auth/signin", request.url);
      url.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    const allowedRoles = ["ADMIN", "ORGANIZER"];
    if (!allowedRoles.includes(token.role as string)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*", "/mobile/:path*"],
};
