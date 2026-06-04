import { db, schema } from "@/db";
import { and, eq, ilike, sql } from "drizzle-orm";
import { UPLOAD_APPROVAL_BONUS } from "@/lib/points";

// Award the uploader their approval bonus and, if they've hit their league's
// upload quota, a promotion ticket. Shared by manual approval (admin) and the
// automated review below.
export async function applyApprovalBonus(uploaderId: number) {
  await db
    .update(schema.users)
    .set({
      weeklyPts: sql`${schema.users.weeklyPts} + ${UPLOAD_APPROVAL_BONUS}`,
      totalPts: sql`${schema.users.totalPts} + ${UPLOAD_APPROVAL_BONUS}`,
      booksUploaded: sql`${schema.users.booksUploaded} + 1`,
      cycleUploads: sql`${schema.users.cycleUploads} + 1`,
    })
    .where(eq(schema.users.id, uploaderId));

  const [uploader] = await db.select().from(schema.users).where(eq(schema.users.id, uploaderId)).limit(1);
  if (uploader?.leagueId) {
    const [league] = await db.select().from(schema.leagues).where(eq(schema.leagues.id, uploader.leagueId)).limit(1);
    if (league && uploader.cycleUploads >= league.uploadsRequired) {
      await db
        .update(schema.users)
        .set({ tickets: sql`${schema.users.tickets} + 1`, cycleUploads: 0 })
        .where(eq(schema.users.id, uploader.id));
    }
  }
}

export type ReviewResult = { approved: boolean; reason: string };

/**
 * Automated review agent: instant rule-based checks so a real, readable book is
 * approved within seconds without a human. Anything that fails is left pending
 * for the coordinator to look at. (Deeper content judgement could be added with
 * an LLM call here later.)
 */
export async function autoReviewBook(opts: {
  head: Uint8Array;
  size: number;
  format: string;
  title: string;
  author: string;
}): Promise<ReviewResult> {
  const { head, size, format, title, author } = opts;

  // 1) The file must really be what it claims (magic bytes).
  const isEpub = head[0] === 0x50 && head[1] === 0x4b; // "PK" (zip)
  const isPdf = head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46; // "%PDF"
  if (format === "EPUB" && !isEpub) return { approved: false, reason: "File isn't a valid EPUB" };
  if (format === "PDF" && !isPdf) return { approved: false, reason: "File isn't a valid PDF" };

  // 2) Sane size (reject empty/placeholder files).
  if (size < 2 * 1024) return { approved: false, reason: "File is too small to be a real book" };

  // 3) Real-looking metadata.
  if (title.trim().length < 2 || author.trim().length < 2) {
    return { approved: false, reason: "Title or author looks incomplete" };
  }

  // 4) Not a duplicate of an existing approved book.
  const [dupe] = await db
    .select({ id: schema.books.id })
    .from(schema.books)
    .where(and(eq(schema.books.status, "approved"), ilike(schema.books.title, title.trim()), ilike(schema.books.author, author.trim())))
    .limit(1);
  if (dupe) return { approved: false, reason: "That title by that author is already in the library" };

  return { approved: true, reason: "Passed automated checks" };
}
