import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCodeForClaims, findOrCreateGoogleUser, googleRedirectUri } from "@/lib/google";
import { encodeSession, SESSION_COOKIE } from "@/lib/session";

const MAX_AGE = 60 * 60 * 24 * 30; // 30 days — matches createSession()

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const savedState = (await cookies()).get("rl_oauth_state")?.value;

  const fail = (reason: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));
    res.cookies.delete("rl_oauth_state");
    return res;
  };

  if (oauthError) return fail("google_denied");
  if (!code || !state || !savedState || state !== savedState) return fail("google_state");

  try {
    const claims = await exchangeCodeForClaims(code, googleRedirectUri(request));
    const user = await findOrCreateGoogleUser(claims);
    const token = await encodeSession({
      userId: user.id,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + MAX_AGE,
    });
    const res = NextResponse.redirect(
      new URL(user.role === "coordinator" ? "/admin" : "/app", request.url)
    );
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE,
    });
    res.cookies.delete("rl_oauth_state");
    return res;
  } catch {
    return fail("google_failed");
  }
}
