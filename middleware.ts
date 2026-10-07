import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;
    if (path.startsWith("/dashboard/coach") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard/client", req.url));
    }
    if (path.startsWith("/dashboard/client") && role === "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard/coach", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: { authorized: ({ token }) => !!token },
    pages: { signIn: "/login" },
  }
);

export const config = { matcher: ["/dashboard/:path*"] };
