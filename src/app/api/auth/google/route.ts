import { NextResponse } from "next/server";
import { buildGoogleAuthUrl, googleConfigured, googleRedirectUri } from "@/lib/google";

// Start the OAuth dance: set a CSRF state cookie and bounce to Google.
export async function GET(request: Request) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_unconfigured", request.url));
  }
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(buildGoogleAuthUrl(googleRedirectUri(request), state));
  res.cookies.set("rl_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
