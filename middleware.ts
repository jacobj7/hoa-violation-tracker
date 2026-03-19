import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith("/dashboard")) {
      if (!token) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
      }
      if (token.role !== "manager" && token.role !== "inspector") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    if (pathname.startsWith("/portal")) {
      if (!token) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
      }
      if (token.role !== "owner") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        return true;
      },
    },
    pages: {
      signIn: "/auth/signin",
    },
  },
);

export const config = {
  matcher: ["/dashboard/:path*", "/portal/:path*"],
};
