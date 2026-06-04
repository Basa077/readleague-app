import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { canUserReadBook } from "@/lib/unlock";

// Streams a book's file through our own origin. This solves three things at once:
//  - CORS: sources like Project Gutenberg send no Access-Control-Allow-Origin,
//    so the in-browser EPUB/PDF readers can't fetch them directly. Same-origin
//    here, so they can.
//  - Content-Type: we always label it application/epub+zip (or pdf) so epub.js /
//    pdf.js parse it even if the upstream mislabels it.
//  - Access control: reward books are gated by canUserReadBook().
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  // URL carries a .epub/.pdf suffix so epub.js / pdf.js pick the right open-mode;
  // strip it to get the numeric id.
  const bookId = Number(String(id).replace(/\.(epub|pdf)$/i, ""));
  if (!bookId) return new NextResponse("Not found", { status: 404 });

  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const [book] = await db.select().from(schema.books).where(eq(schema.books.id, bookId)).limit(1);
  if (!book || !book.fileUrl) return new NextResponse("Not found", { status: 404 });
  if (!(await canUserReadBook(user, book))) return new NextResponse("Forbidden", { status: 403 });

  let upstream: Response;
  try {
    upstream = await fetch(book.fileUrl, { redirect: "follow" });
  } catch {
    return new NextResponse("Upstream fetch failed", { status: 502 });
  }
  if (!upstream.ok || !upstream.body) return new NextResponse("Upstream error", { status: 502 });

  const isPdf = (book.format ?? "").toUpperCase() === "PDF" || book.fileUrl.toLowerCase().includes(".pdf");
  // Open books can be cached at the edge (fast repeat loads for everyone);
  // reward books stay private to the authorized reader.
  const cache = book.lockType === "open"
    ? "public, max-age=86400, s-maxage=86400, immutable"
    : "private, max-age=3600";
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": isPdf ? "application/pdf" : "application/epub+zip",
      "Cache-Control": cache,
    },
  });
}
