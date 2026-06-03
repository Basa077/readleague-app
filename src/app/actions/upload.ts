"use server";

import { put } from "@vercel/blob";
import { db, schema } from "@/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, requireCoordinator } from "@/lib/auth";

const MAX_FILE = 25 * 1024 * 1024; // 25 MB

const metaSchema = z.object({
  title: z.string().min(1).max(200),
  author: z.string().min(1).max(120),
  genre: z.enum(["fiction", "nonfic", "sci", "history", "self", "poetry", "academic"]),
  description: z.string().max(1200).optional(),
  year: z.coerce.number().int().optional(),
});

export type UploadState = { error?: string; ok?: boolean; bookId?: number };

async function uploadFile(file: File | null): Promise<{ url: string | null; format: string | null }> {
  if (!file || file.size === 0) return { url: null, format: null };
  if (file.size > MAX_FILE) throw new Error("File too large (max 25 MB)");

  const lowerName = file.name.toLowerCase();
  let format: string | null = null;
  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") format = "PDF";
  else if (lowerName.endsWith(".epub") || file.type === "application/epub+zip") format = "EPUB";
  else throw new Error("Only PDF or EPUB files are supported");

  const safeName = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]+/gi, "_")}`;
  const blob = await put(`books/${safeName}`, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type || (format === "PDF" ? "application/pdf" : "application/epub+zip"),
  });
  return { url: blob.url, format };
}

/** Reader uploads a book → goes to pending queue. */
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

  const file = formData.get("file") as File | null;
  let fileInfo;
  try {
    fileInfo = await uploadFile(file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }
  if (!fileInfo.url) return { error: "Please attach a PDF or EPUB file" };

  const [book] = await db
    .insert(schema.books)
    .values({
      ...parsed.data,
      format: fileInfo.format!,
      fileUrl: fileInfo.url,
      status: "pending",
      uploaderId: user.id,
    })
    .returning();

  revalidatePath("/app/upload");
  revalidatePath("/admin/approvals");
  return { ok: true, bookId: book.id };
}

/** Coordinator creates a book → approved immediately, lock options included. */
const adminCreateSchema = metaSchema.extend({
  lockType: z.enum(["open", "league_winner", "league_top_n", "admin_grant"]).default("open"),
  lockLeagueId: z.string().nullable().optional(),
  lockPosition: z.coerce.number().int().min(1).max(20).optional(),
  lockNote: z.string().max(200).optional(),
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
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const file = formData.get("file") as File | null;
  let fileInfo;
  try {
    fileInfo = await uploadFile(file);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload failed" };
  }

  const [created] = await db
    .insert(schema.books)
    .values({
      title: parsed.data.title,
      author: parsed.data.author,
      genre: parsed.data.genre,
      description: parsed.data.description,
      year: parsed.data.year,
      format: fileInfo.format,
      fileUrl: fileInfo.url,
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
  await db
    .update(schema.books)
    .set({ pages })
    .where(eq(schema.books.id, bookId));
  // also: don't shrink an existing accurate count
  void sql;
}
