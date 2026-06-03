"use server";

import { db, schema } from "@/db";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { computePoints } from "@/lib/points";
import { canUserReadBook } from "@/lib/unlock";

const logSchema = z.object({
  bookId: z.coerce.number().int().positive(),
  pagesRead: z.coerce.number().int().min(0).max(2000),
  minutes: z.coerce.number().int().min(0).max(600),
  cfi: z.string().max(800).optional(),
  totalPages: z.coerce.number().int().min(1).max(10000).optional(),
});

export type LogState = { error?: string; ok?: boolean; pts?: number };

/**
 * Called automatically by the reader when the user exits or after each milestone.
 * Computes points and updates progress + standings.
 */
export async function logSessionAction(input: {
  bookId: number;
  pagesRead: number;
  minutes: number;
  cfi?: string;
  totalPages?: number;
}): Promise<LogState> {
  const user = await requireUser();
  const parsed = logSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (parsed.data.pagesRead <= 0 && parsed.data.minutes <= 0) return { ok: true, pts: 0 };

  const [book] = await db.select().from(schema.books).where(eq(schema.books.id, parsed.data.bookId)).limit(1);
  if (!book) return { error: "Book not found" };
  if (book.status !== "approved") return { error: "Book not yet approved" };

  const allowed = await canUserReadBook(user, book);
  if (!allowed) return { error: "This book is locked" };

  // Save detected total pages on the book if we have a better count
  if (parsed.data.totalPages && (!book.pages || parsed.data.totalPages > book.pages)) {
    await db
      .update(schema.books)
      .set({ pages: parsed.data.totalPages })
      .where(eq(schema.books.id, book.id));
    book.pages = parsed.data.totalPages;
  }

  const pts = computePoints(parsed.data.pagesRead, parsed.data.minutes);

  await db.insert(schema.readingSessions).values({
    userId: user.id,
    bookId: book.id,
    pagesRead: parsed.data.pagesRead,
    minutes: parsed.data.minutes,
    pts,
  });

  await db
    .update(schema.users)
    .set({
      weeklyPts: sql`${schema.users.weeklyPts} + ${pts}`,
      totalPts: sql`${schema.users.totalPts} + ${pts}`,
    })
    .where(eq(schema.users.id, user.id));

  // Update progress
  const [existing] = await db
    .select()
    .from(schema.userProgress)
    .where(and(eq(schema.userProgress.userId, user.id), eq(schema.userProgress.bookId, book.id)))
    .limit(1);

  const pageCap = book.pages ?? 0;
  if (existing) {
    const newPage = pageCap > 0 ? Math.min(pageCap, existing.currentPage + parsed.data.pagesRead) : existing.currentPage + parsed.data.pagesRead;
    const finished = pageCap > 0 && newPage >= pageCap;
    await db
      .update(schema.userProgress)
      .set({
        currentPage: newPage,
        cfi: parsed.data.cfi ?? existing.cfi,
        finished,
        lastReadAt: new Date(),
      })
      .where(eq(schema.userProgress.id, existing.id));
    if (finished && !existing.finished) {
      await db
        .update(schema.users)
        .set({ booksRead: sql`${schema.users.booksRead} + 1` })
        .where(eq(schema.users.id, user.id));
    }
  } else {
    const newPage = pageCap > 0 ? Math.min(pageCap, parsed.data.pagesRead) : parsed.data.pagesRead;
    const finished = pageCap > 0 && newPage >= pageCap;
    await db.insert(schema.userProgress).values({
      userId: user.id,
      bookId: book.id,
      currentPage: newPage,
      cfi: parsed.data.cfi,
      finished,
    });
    if (finished) {
      await db
        .update(schema.users)
        .set({ booksRead: sql`${schema.users.booksRead} + 1` })
        .where(eq(schema.users.id, user.id));
    }
  }

  revalidatePath("/app");
  revalidatePath(`/app/books/${book.id}`);
  revalidatePath("/app/leagues");
  revalidatePath("/app/profile");
  revalidatePath("/app/library");
  return { ok: true, pts };
}

/** Just save reading position (CFI) — for EPUB resume, no session log. */
export async function savePositionAction(bookId: number, cfi: string, currentPage: number): Promise<void> {
  const user = await requireUser();
  const [existing] = await db
    .select()
    .from(schema.userProgress)
    .where(and(eq(schema.userProgress.userId, user.id), eq(schema.userProgress.bookId, bookId)))
    .limit(1);
  if (existing) {
    await db
      .update(schema.userProgress)
      .set({ cfi, currentPage: Math.max(existing.currentPage, currentPage), lastReadAt: new Date() })
      .where(eq(schema.userProgress.id, existing.id));
  } else {
    await db.insert(schema.userProgress).values({
      userId: user.id,
      bookId,
      currentPage,
      cfi,
    });
  }
}
