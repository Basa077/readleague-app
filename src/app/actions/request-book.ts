"use server";

import { db, schema } from "@/db";
import { and, eq, ilike, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { findFreeBook } from "@/lib/booksource";
import { AUTO_LOCK_THRESHOLD } from "@/lib/config";

export type RequestBookState = {
  ok?: boolean;
  bookId?: number;
  title?: string;
  existing?: boolean;
  error?: string;
};

/**
 * Reader requests a book we don't have. We search the free public-domain
 * libraries, and if a real copy exists we add it to the catalogue immediately
 * and hand back its id so the reader can start reading. No coordinator step —
 * the source is trusted (Project Gutenberg) and the file streams through our
 * own /api/book-file proxy.
 */
export async function requestBookAction(
  _prev: RequestBookState,
  formData: FormData
): Promise<RequestBookState> {
  await requireUser();
  const query = String(formData.get("q") || "").trim();
  if (query.length < 2) return { error: "Type a title to request." };

  // Already in the library (someone may have just added it)?
  const [existingByTitle] = await db
    .select()
    .from(schema.books)
    .where(and(eq(schema.books.status, "approved"), ilike(schema.books.title, query)))
    .limit(1);
  if (existingByTitle) {
    return { ok: true, bookId: existingByTitle.id, title: existingByTitle.title, existing: true };
  }

  const found = await findFreeBook(query);
  if (!found) {
    return {
      error:
        "We couldn't find a free copy of that one. It may still be in copyright — try a classic title or author, or ask your coordinator to add it.",
    };
  }

  // Dedupe on the source file (two readers requesting the same title at once).
  const [dupe] = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.fileUrl, found.fileUrl))
    .limit(1);
  if (dupe) {
    return { ok: true, bookId: dupe.id, title: dupe.title, existing: true };
  }

  // While the library is small, requested books are openly readable. Past
  // AUTO_LOCK_THRESHOLD we'll gate them behind league rules instead.
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.books)
    .where(eq(schema.books.status, "approved"));
  const openForNow = count < AUTO_LOCK_THRESHOLD;

  const [created] = await db
    .insert(schema.books)
    .values({
      title: found.title,
      author: found.author,
      genre: found.genre,
      format: "EPUB",
      fileUrl: found.fileUrl,
      coverUrl: found.coverUrl,
      year: found.year,
      description: `Added on request from Project Gutenberg.`,
      status: "approved",
      lockType: openForNow ? "open" : "admin_grant",
      lockNote: openForNow ? null : "Requested · unlock via league",
      uploaderId: null,
    })
    .returning();

  revalidatePath("/app");
  revalidatePath("/app/library");
  revalidatePath("/app/search");
  return { ok: true, bookId: created.id, title: created.title, existing: false };
}
