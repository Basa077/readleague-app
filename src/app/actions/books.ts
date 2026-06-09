"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireCoordinator } from "@/lib/auth";

const lockSchema = z.object({
  bookId: z.coerce.number().int().positive(),
  lockType: z.enum(["open", "league_winner", "league_top_n", "admin_grant"]),
  lockLeagueId: z.string().nullable().optional(),
  lockPosition: z.coerce.number().int().min(1).max(20).optional(),
  lockNote: z.string().max(200).optional(),
});

export type LockState = { error?: string; ok?: boolean };

export async function updateBookLockAction(_prev: LockState, formData: FormData): Promise<LockState> {
  await requireCoordinator();
  const parsed = lockSchema.safeParse({
    bookId: formData.get("bookId"),
    lockType: formData.get("lockType"),
    lockLeagueId: formData.get("lockLeagueId") || null,
    lockPosition: formData.get("lockPosition") || undefined,
    lockNote: formData.get("lockNote") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await db
    .update(schema.books)
    .set({
      lockType: parsed.data.lockType,
      lockLeagueId:
        parsed.data.lockType === "open" || parsed.data.lockType === "admin_grant"
          ? null
          : parsed.data.lockLeagueId,
      lockPosition: parsed.data.lockType === "league_top_n" ? parsed.data.lockPosition ?? 4 : null,
      lockNote: parsed.data.lockNote || null,
    })
    .where(eq(schema.books.id, parsed.data.bookId));

  revalidatePath("/admin/books");
  revalidatePath(`/admin/books/${parsed.data.bookId}`);
  revalidatePath("/app");
  return { ok: true };
}

const priceSchema = z.object({
  bookId: z.coerce.number().int().positive(),
  priceGhs: z.coerce.number().int().min(0).max(100000),
});

export type PriceState = { error?: string; ok?: boolean };

export async function updateBookPriceAction(_prev: PriceState, formData: FormData): Promise<PriceState> {
  await requireCoordinator();
  const parsed = priceSchema.safeParse({
    bookId: formData.get("bookId"),
    priceGhs: formData.get("priceGhs"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await db.update(schema.books).set({ priceGhs: parsed.data.priceGhs }).where(eq(schema.books.id, parsed.data.bookId));

  revalidatePath(`/admin/books/${parsed.data.bookId}`);
  revalidatePath(`/app/books/${parsed.data.bookId}`);
  revalidatePath("/app");
  return { ok: true };
}
