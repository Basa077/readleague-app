import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { BookCover } from "@/components/BookCover";
import { BackButton } from "@/components/BackButton";
import { canUserReadBook, lockDescription } from "@/lib/unlock";
import { BuyButton } from "./BuyButton";

export default async function BookDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const user = await requireUser();
  const { id } = await props.params;
  const { payment } = await props.searchParams;
  const bookId = Number(id);
  if (!bookId) notFound();

  const [book] = await db.select().from(schema.books).where(eq(schema.books.id, bookId)).limit(1);
  if (!book) notFound();

  const allowed = await canUserReadBook(user, book);
  const [progress] = await db
    .select()
    .from(schema.userProgress)
    .where(and(eq(schema.userProgress.userId, user.id), eq(schema.userProgress.bookId, book.id)))
    .limit(1);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6 rl-fadeup">
      <BackButton fallbackHref="/app/library" label="Back to library" />

      <div className="flex gap-5 items-start">
        <BookCover title={book.title} author={book.author} genre={book.genre} size={160} locked={!allowed} reward={book.lockType !== "open" && allowed} />
        <div className="flex-1 min-w-0 space-y-2">
          <h1 className="rl-serif text-2xl sm:text-3xl leading-tight">{book.title}</h1>
          <div className="text-sm" style={{ color: "var(--ink-2)" }}>{book.author}</div>
          <div className="flex gap-1.5 flex-wrap mt-2">
            <span className="rl-pill">{book.genre}</span>
            {book.pages && <span className="rl-pill">{book.pages} pages</span>}
            {book.format && <span className="rl-pill">{book.format}</span>}
            {book.year && <span className="rl-pill">{book.year}</span>}
            {(book.priceGhs ?? 0) > 0 && (
              <span className="rl-pill" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
                {allowed ? "✓ Owned" : `GHS ${book.priceGhs}`}
              </span>
            )}
          </div>
          {book.lockType !== "open" && (
            <div className="text-xs px-3 py-2 rounded-md inline-block mt-2" style={{ background: allowed ? "var(--accent-soft)" : "var(--paper-3)", color: allowed ? "var(--accent-ink)" : "var(--ink-2)" }}>
              {allowed ? "🏆 " : "🔒 "}{lockDescription(book)}
            </div>
          )}
        </div>
      </div>

      {payment === "failed" && (
        <div className="rl-card p-3 text-sm" style={{ background: "var(--claret-soft)", color: "var(--claret)" }}>
          Payment didn’t go through. Nothing was charged — you can try again.
        </div>
      )}

      {/* Primary CTA */}
      {allowed && book.fileUrl ? (
        <div className="rl-card p-4 sm:p-5 flex items-center justify-between gap-4">
          <div>
            <div className="rl-serif text-lg">{progress?.finished ? "You finished this" : progress ? "Pick up where you left off" : "Ready to read"}</div>
            {progress && book.pages && !progress.finished && (
              <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
                Page {progress.currentPage} of {book.pages} · {Math.round((progress.currentPage / book.pages) * 100)}%
              </div>
            )}
            {!progress && (
              <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>The app auto-tracks pages turned and active time. Max 3 pts per session.</div>
            )}
          </div>
          <Link href={`/app/read/${book.id}`} className="rl-btn rl-btn-primary">
            {progress?.finished ? "Re-read" : progress ? "Continue" : "Start reading"}
          </Link>
        </div>
      ) : (book.priceGhs ?? 0) > 0 && !allowed ? (
        <div className="rl-card p-4 sm:p-5 flex items-center justify-between gap-4">
          <div>
            <div className="rl-serif text-lg">Premium book</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
              Buy once with Mobile Money or card — read it anytime, on any device.
            </div>
          </div>
          <BuyButton bookId={book.id} priceGhs={book.priceGhs} />
        </div>
      ) : !allowed ? (
        <div className="rl-card p-5 text-sm text-center" style={{ color: "var(--ink-2)" }}>
          🔒 This is a reward book. {lockDescription(book)} to unlock it.
        </div>
      ) : (
        <div className="rl-card p-5 text-sm" style={{ color: "var(--ink-2)" }}>
          This book has no file attached yet. The coordinator can add one from the admin panel.
        </div>
      )}

      {book.description && (
        <section className="space-y-1.5">
          <h3 className="rl-serif text-lg">About this book</h3>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>{book.description}</p>
        </section>
      )}

      {progress && (
        <section className="rl-card p-4">
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>Your progress</div>
          {book.pages ? (
            <>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--paper-3)" }}>
                <div style={{ width: `${Math.round((progress.currentPage / book.pages) * 100)}%`, background: "var(--accent)", height: "100%" }} />
              </div>
              <div className="rl-mono text-xs mt-1.5" style={{ color: "var(--ink-3)" }}>
                {progress.currentPage} / {book.pages} pages
              </div>
            </>
          ) : (
            <div className="rl-mono text-sm">Page {progress.currentPage}</div>
          )}
        </section>
      )}
    </div>
  );
}
