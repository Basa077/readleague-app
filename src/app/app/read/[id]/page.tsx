import { notFound, redirect } from "next/navigation";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { canUserReadBook } from "@/lib/unlock";
import { ReaderShell } from "./ReaderShell";

export default async function ReadPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await props.params;
  const bookId = Number(id);
  if (!bookId) notFound();

  const [book] = await db.select().from(schema.books).where(eq(schema.books.id, bookId)).limit(1);
  if (!book) notFound();
  if (!(await canUserReadBook(user, book))) redirect(`/app/books/${bookId}`);
  if (!book.fileUrl) redirect(`/app/books/${bookId}`);

  const [progress] = await db
    .select()
    .from(schema.userProgress)
    .where(and(eq(schema.userProgress.userId, user.id), eq(schema.userProgress.bookId, book.id)))
    .limit(1);

  const format = book.format ?? (book.fileUrl.toLowerCase().endsWith(".epub") ? "EPUB" : "PDF");

  return (
    <ReaderShell
      book={{
        id: book.id,
        title: book.title,
        author: book.author,
        // Load through our same-origin proxy (CORS-safe + correct content-type).
        // The .epub/.pdf suffix tells epub.js / pdf.js how to open it.
        fileUrl: `/api/book-file/${book.id}.${format === "PDF" ? "pdf" : "epub"}`,
        format,
        pages: book.pages,
      }}
      resume={{
        currentPage: progress?.currentPage ?? 0,
        cfi: progress?.cfi ?? null,
        finished: progress?.finished ?? false,
      }}
    />
  );
}
