import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Minimal hand-rolled Google OAuth 2.0 (Authorization Code) helper.
// Fits the app's existing HMAC-cookie session — no extra auth dependency.

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// Build the public origin from forwarded headers so the redirect_uri matches
// whether we're on localhost (http) or Vercel (https) — must exactly equal a
// URI registered in the Google OAuth client.
function getOrigin(request: Request): string {
  const h = request.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

export function googleRedirectUri(request: Request): string {
  return process.env.GOOGLE_REDIRECT_URI || `${getOrigin(request)}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

type GoogleClaims = { sub: string; email?: string; email_verified?: boolean | string; name?: string };

// Exchange the auth code for tokens (server-to-server, authenticated with our
// client secret) and read the identity claims out of the returned id_token.
export async function exchangeCodeForClaims(code: string, redirectUri: string): Promise<GoogleClaims> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("Google returned no id_token");
  const payload = data.id_token.split(".")[1];
  const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  return JSON.parse(json) as GoogleClaims;
}

// Sign in the Google user: match an existing account by email (account linking),
// otherwise create a fresh reader in the entry league.
export async function findOrCreateGoogleUser(claims: GoogleClaims) {
  const email = (claims.email ?? "").toLowerCase().trim();
  if (!email) throw new Error("Google account has no email");

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing) return existing;

  const handle = await uniqueHandle(email);
  const displayName = (claims.name?.trim() || email.split("@")[0]).slice(0, 60);
  // Google accounts authenticate via OAuth — store an unguessable random hash so
  // the password-login path can never match for them.
  const passwordHash = await bcrypt.hash(`google:${claims.sub}:${crypto.randomUUID()}`, 10);

  const [created] = await db
    .insert(schema.users)
    .values({ email, handle, displayName, passwordHash, role: "reader", leagueId: "tuareg" })
    .returning();
  return created;
}

async function uniqueHandle(email: string): Promise<string> {
  const base =
    (email.split("@")[0] || "reader").toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 24) || "reader";
  let candidate = base.length >= 3 ? base : `${base}_rl`;
  for (let i = 0; i < 50; i++) {
    const [hit] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.handle, candidate))
      .limit(1);
    if (!hit) return candidate;
    candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `${base}${Date.now()}`;
}
