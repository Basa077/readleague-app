"use server";

import { db, schema } from "@/db";
import { eq, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/session";

const signupSchema = z.object({
  email: z.string().email(),
  handle: z.string().min(3).max(30).regex(/^[a-z0-9_.-]+$/i, "letters, numbers, _ . - only"),
  displayName: z.string().min(2).max(60),
  password: z.string().min(8),
  role: z.enum(["reader", "coordinator"]).default("reader"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type AuthState = { error?: string; ok?: boolean };

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    email: String(formData.get("email") || "").toLowerCase().trim(),
    handle: String(formData.get("handle") || "").toLowerCase().trim(),
    displayName: String(formData.get("displayName") || "").trim(),
    password: String(formData.get("password") || ""),
    role: (formData.get("role") as string) || "reader",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { email, handle, displayName, password, role } = parsed.data;

  const existing = await db
    .select()
    .from(schema.users)
    .where(or(eq(schema.users.email, email), eq(schema.users.handle, handle)))
    .limit(1);
  if (existing.length) {
    return { error: "Email or handle already taken" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Auto-assign new readers to Tuareg (entry league)
  const leagueId = role === "reader" ? "tuareg" : null;

  const [user] = await db
    .insert(schema.users)
    .values({ email, handle, displayName, passwordHash, role, leagueId })
    .returning();

  await createSession(user.id, user.role);
  redirect(user.role === "coordinator" ? "/admin" : "/app");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") || "").toLowerCase().trim(),
    password: String(formData.get("password") || ""),
  });
  if (!parsed.success) {
    return { error: "Invalid email or password" };
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, parsed.data.email))
    .limit(1);
  if (!user) return { error: "Invalid email or password" };

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return { error: "Invalid email or password" };

  await createSession(user.id, user.role);
  redirect(user.role === "coordinator" ? "/admin" : "/app");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
