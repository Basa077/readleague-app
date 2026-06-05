"use server";

import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, requireCoordinator } from "@/lib/auth";
import { applyApprovalBonus, autoReviewBook } from "@/lib/approval";

// Files are uploaded directly to Vercel Blob from the browser (see
// src/lib/blob-client.ts + /api/blob/upload). These actions receive the
// resulting blob URL and metadata, then create the book row.

const metaSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().min(1).max(120),
  genre: z.enum(["fiction", "nonfic", "sci", "history", "self", "poetry", "academic"]),
  description: z.string().max(1200).optional(),
  year: z.coerce.number().int().optional(),
});

const fileSchema = z.object({
  fileUrl: z.string().url(),
  format: z.enum(["PDF", "EPUB"]),
  fileSize: z.coerce.number().int().nonnegative(),
});

export type UploadState = { error?: string; ok?: boolean; bookId?: number; autoApproved?: boolean; reviewNote?: string };

/** Read the first bytes of an already-uploaded blob so the automated review can
 * check the file's magic bytes. */
async function headBytes(url: string): Promise<Uint8Array> {
  try {
    const r = await fetch(url, { headers: { Range: "bytes=0-7" }, signal: AbortSignal.timeout(8000) });
    if (!r.ok && r.status !== 206) return new Uint8Array();
    return new Uint8Array(await r.arrayBuffer());
  } catch {
    return new Uint8Array();
  }
}

/** Reader finalizes a book upload → automated review decides instant-approve vs pending. */
export async function readerUploadBookAction(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const user = await requireUser();
  const parsed = metaSchema.safeParse({
    title: formData.get("title"),
    author: formData.get("author"),
    genre: formData.get("genre"),
    description: formData.get("description") || undefined,
    year: formData.get("year") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const fileParsed = fileSchema.safeParse({
    fileUrl: formData.get("fileUrl"),
    format: formData.get("format"),
    fileSize: formData.get("fileSize") || 0,
  });
  if (!fileParsed.success) return { error: "Please attach a PDF or EPUB file." };

  const head = await headBytes(fileParsed.data.fileUrl);

  // Automated review agent — approve good books instantly, else leave pending.
  const review = await autoReviewBook({
    head,
    size: fileParsed.data.fileSize,
    format: fileParsed.data.format,
    title: parsed.data.title,
    author: parsed.data.author,
  });

  const [book] = await db
    .insert(schema.books)
    .values({
      ...parsed.data,
      format: fileParsed.data.format,
      fileUrl: fileParsed.data.fileUrl,
      status: review.approved ? "approved" : "pending",
      uploaderId: user.id,
    })
    .returning();

  if (review.approved) await applyApprovalBonus(user.id);

  revalidatePath("/app/upload");
  revalidatePath("/admin/approvals");
  revalidatePath("/app");
  return { ok: true, bookId: book.id, autoApproved: review.approved, reviewNote: review.reason };
}

/** Coordinator creates a book → approved immediately, lock options included. */
const adminCreateSchema = metaSchema.extend({
  lockType: z.enum(["open", "league_winner", "league_top_n", "admin_grant"]).default("open"),
  lockLeagueId: z.string().nullable().optional(),
  lockPosition: z.coerce.number().int().min(1).max(20).optional(),
  lockNote: z.string().max(200).optional(),
  fileUrl: z.string().url().optional().or(z.literal("")),
  format: z.enum(["PDF", "EPUB"]).optional(),
});

export async function adminCreateBookAction(_prev: UploadState, formData: FormData): Promise<UploadState> {
  await requireCoordinator();
  const parsed = adminCreateSchema.safeParse({
    title: formData.get("title"),
    author: formData.get("author"),
    genre: formData.get("genre"),
    description: formData.get("description") || undefined,
    year: formData.get("year") || undefined,
    lockType: formData.get("lockType") || "open",
    lockLeagueId: formData.get("lockLeagueId") || null,
    lockPosition: formData.get("lockPosition") || undefined,
    lockNote: formData.get("lockNote") || undefined,
    fileUrl: formData.get("fileUrl") || "",
    format: formData.get("format") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const fileUrl = parsed.data.fileUrl && parsed.data.fileUrl.length > 0 ? parsed.data.fileUrl : null;

  const [created] = await db
    .insert(schema.books)
    .values({
      title: parsed.data.title,
      author: parsed.data.author,
      genre: parsed.data.genre,
      description: parsed.data.description,
      year: parsed.data.year,
      format: fileUrl ? parsed.data.format ?? null : null,
      fileUrl,
      status: "approved",
      lockType: parsed.data.lockType,
      lockLeagueId:
        parsed.data.lockType === "open" || parsed.data.lockType === "admin_grant"
          ? null
          : parsed.data.lockLeagueId,
      lockPosition: parsed.data.lockType === "league_top_n" ? parsed.data.lockPosition ?? 4 : null,
      lockNote: parsed.data.lockNote,
    })
    .returning();

  revalidatePath("/admin/books");
  revalidatePath("/app");
  return { ok: true, bookId: created.id };
}

/** When the reader-side reader auto-detects total pages from PDF, save it back. */
export async function saveBookPagesAction(bookId: number, pages: number): Promise<void> {
  await requireUser();
  if (!Number.isInteger(pages) || pages <= 0 || pages > 10000) return;
  await db.update(schema.books).set({ pages }).where(eq(schema.books.id, bookId));
  void sql;
}
