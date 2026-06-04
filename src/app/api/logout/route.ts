import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Clears the session cookie and sends the user to /login. Used both for normal
// logout and to break out of a stale session: if a layout has a validly-signed
// cookie but the user no longer resolves, redirecting here drops the cookie so
// the middleware won't bounce /login back to /app (which would loop forever).
export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/login", request.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
