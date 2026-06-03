import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getSession } from "./session";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);
  return user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireCoordinator() {
  const user = await requireUser();
  if (user.role !== "coordinator") throw new Error("FORBIDDEN");
  return user;
}
