import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";

interface ExtendedToken extends JWT {
  role?: string;
}

export default withAuth(
  function middleware(
    req: NextRequest & { nextauth: { token: ExtendedToken } },
  ) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;
    const role = token?.role;

    if (pathname.startsWith("/dashboard/inspector")) {
      if (role !== "inspector") {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        url.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith("/dashboard/board")) {
      if (role !== "board") {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        url.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(url);
      }
    }

    if (pathname.startsWith("/dashboard/owner")) {
      if (role !== "owner") {
        const url = req.nextUrl.clone();
        url.pathname = "/dashboard";
        url.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
