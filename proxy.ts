import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "quiniela_session";

/**
 * First gate: if there is no session cookie, send page requests to /login.
 * Real cryptographic verification happens in server components / route handlers
 * via getSession(); this just improves UX and blocks obvious unauthenticated access.
 */
export function proxy(req: NextRequest) {
  const hasCookie = req.cookies.has(COOKIE_NAME);
  if (!hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Protect everything except: API routes (self-checked), the login page, and assets.
  matcher: ["/((?!api|login|_next/static|_next/image|favicon.ico).*)"],
};
