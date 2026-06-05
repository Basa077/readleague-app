"use client";

import { upload } from "@vercel/blob/client";
import { MAX_BOOK_BYTES } from "@/lib/config";

export type UploadedFile = { url: string; format: "PDF" | "EPUB"; size: number };

/**
 * Uploads a book file straight from the browser to Vercel Blob (via the token
 * route at /api/blob/upload). Returns the public URL + detected format, which
 * the caller then submits to the finalize server action. Large files are
 * handled transparently — they never touch a Serverless Function body.
 */
export async function uploadBookFile(file: File): Promise<UploadedFile> {
  const lower = file.name.toLowerCase();
  const format: "PDF" | "EPUB" | null =
    lower.endsWith(".pdf") || file.type === "application/pdf"
      ? "PDF"
      : lower.endsWith(".epub") || file.type === "application/epub+zip"
      ? "EPUB"
      : null;
  if (!format) throw new Error("Only PDF or EPUB files are supported.");
  if (file.size === 0) throw new Error("That file looks empty.");
  if (file.size > MAX_BOOK_BYTES) {
    throw new Error(`File too large (max ${Math.round(MAX_BOOK_BYTES / 1024 / 1024)} MB).`);
  }

  const safeName = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]+/gi, "_")}`;
  const blob = await upload(`books/${safeName}`, file, {
    access: "public",
    handleUploadUrl: "/api/blob/upload",
    contentType: file.type || (format === "PDF" ? "application/pdf" : "application/epub+zip"),
  });
  return { url: blob.url, format, size: file.size };
}
