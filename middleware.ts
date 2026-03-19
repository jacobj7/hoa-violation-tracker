import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-key-change-in-production",
);

interface JWTPayload {
  sub?: string;
  role?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

function extractToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get("auth-token")?.value;
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isManagerRoute = pathname.startsWith("/manager");
  const isOwnerRoute = pathname.startsWith("/owner");

  if (!isManagerRoute && !isOwnerRoute) {
    return NextResponse.next();
  }

  const token = extractToken(request);

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyToken(token);

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    loginUrl.searchParams.set("error", "invalid_token");
    return NextResponse.redirect(loginUrl);
  }

  const userRole = payload.role;

  if (isManagerRoute && userRole !== "manager") {
    if (!userRole) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (isOwnerRoute && userRole !== "owner") {
    if (!userRole) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      loginUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.sub || "");
  requestHeaders.set("x-user-role", userRole || "");
  requestHeaders.set("x-user-email", payload.email || "");

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/manager/:path*", "/owner/:path*"],
};
