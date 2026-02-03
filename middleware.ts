// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
export default withAuth(
  function middleware(req) {
    // Allow access to admin routes
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/admin/login",
    },
  },
);
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is /mobile/*
  if (pathname.startsWith("/mobile")) {
    // Get session token
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If not authenticated, redirect to login
    if (!token) {
      const url = new URL("/auth/signin", request.url);
      // Save callback URL to redirect back after login
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    // Optional: Check user role
    // Uncomment nếu muốn chỉ admin/organizer mới vào được /mobile

    const allowedRoles = ["ADMIN", "ORGANIZER"];
    if (!allowedRoles.includes(token.role as string)) {
      const url = new URL("/", request.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*", "/mobile/:path*"],
};
