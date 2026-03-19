import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    const role = token.role as string | undefined;

    const ownerOnlyPaths = [
      "/settings/billing",
      "/settings/organization",
      "/admin/users",
      "/admin/roles",
    ];

    const managerOrOwnerPaths = [
      "/dashboard/reports",
      "/dashboard/analytics",
      "/team",
      "/projects/create",
      "/projects/delete",
    ];

    const isOwnerOnlyPath = ownerOnlyPaths.some((path) =>
      pathname.startsWith(path),
    );

    const isManagerOrOwnerPath = managerOrOwnerPaths.some((path) =>
      pathname.startsWith(path),
    );

    if (isOwnerOnlyPath) {
      if (role !== "owner") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    if (isManagerOrOwnerPath) {
      if (role !== "owner" && role !== "manager") {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/team/:path*",
    "/projects/:path*",
  ],
};
