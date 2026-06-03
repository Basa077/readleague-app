import Link from "next/link";
import { db, schema } from "@/db";
import { and, eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { BookCover } from "@/components/BookCover";

export default async function LibraryPage() {
  const user = await requireUser();

  const inProgress = await db
    .select({ progress: schema.userProgress, book: schema.books })
    .from(schema.userProgress)
    .innerJoin(schema.books, eq(schema.books.id, schema.userProgress.bookId))
    .where(and(eq(schema.userProgress.userId, user.id), eq(schema.userProgress.finished, false)))
    .orderBy(desc(schema.userProgress.lastReadAt));

  const finished = await db
    .select({ progress: schema.userProgress, book: schema.books })
    .from(schema.userProgress)
    .innerJoin(schema.books, eq(schema.books.id, schema.userProgress.bookId))
    .where(and(eq(schema.userProgress.userId, user.id), eq(schema.userProgress.finished, true)))
    .orderBy(desc(schema.userProgress.lastReadAt));

  const rewards = await db
    .select({ unlock: schema.bookUnlocks, book: schema.books })
    .from(schema.bookUnlocks)
    .innerJoin(schema.books, eq(schema.books.id, schema.bookUnlocks.bookId))
    .where(eq(schema.bookUnlocks.userId, user.id))
    .orderBy(desc(schema.bookUnlocks.grantedAt));

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-5 lg:py-8 space-y-8 rl-fadeup max-w-6xl mx-auto">
      <header className="space-y-1">
        <h1 className="rl-serif text-3xl sm:text-4xl">Library</h1>
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          {finished.length} finished · {inProgress.length} in progress · {rewards.length} rewards
        </p>
      </header>

      {rewards.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="rl-serif text-2xl">Rewards</h2>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>Books you earned</p>
            </div>
            <span className="rl-pill rl-foil text-[10px]" style={{ color: "#1A1208" }}>🏆 unlocked</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {rewards.map(({ unlock, book }) => (
              <Link key={book.id} href={book.fileUrl ? `/app/read/${book.id}` : `/app/books/${book.id}`} className="space-y-1.5 group">
                <div className="transition group-hover:-translate-y-1">
                  <BookCover title={book.title} author={book.author} genre={book.genre} size={128} reward />
                </div>
                <div className="text-[12px] line-clamp-2 leading-snug">{book.title}</div>
                <div className="text-[10px]" style={{ color: "var(--accent-ink)" }}>{unlock.reason}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="rl-serif text-2xl">Currently reading</h2>
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>Pick up where you left off</p>
          </div>
        </div>
        {inProgress.length === 0 ? (
          <div className="rl-card p-6 text-sm text-center" style={{ color: "var(--ink-3)" }}>
            Nothing in progress yet. Tap a book to start reading.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {inProgress.map(({ progress, book }) => {
              const pct = book.pages ? Math.round((progress.currentPage / book.pages) * 100) : 0;
              return (
                <Link key={book.id} href={book.fileUrl ? `/app/read/${book.id}` : `/app/books/${book.id}`} className="rl-card p-3 flex gap-3 items-center hover:bg-[var(--paper-3)] transition">
                  <BookCover title={book.title} author={book.author} genre={book.genre} size={64} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm line-clamp-1">{book.title}</div>
                    <div className="text-xs" style={{ color: "var(--ink-3)" }}>{book.author}</div>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--paper-3)" }}>
                      <div style={{ width: `${pct}%`, background: "var(--accent)", height: "100%" }} />
                    </div>
                    <div className="text-[10px] rl-mono mt-1" style={{ color: "var(--ink-3)" }}>
                      {book.pages ? `${progress.currentPage} / ${book.pages} · ${pct}%` : `page ${progress.currentPage}`}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {finished.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h2 className="rl-serif text-2xl">Finished</h2>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>{finished.length} books</p>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {finished.map(({ book }) => (
              <Link key={book.id} href={`/app/books/${book.id}`} className="space-y-1.5">
                <BookCover title={book.title} author={book.author} genre={book.genre} size={128} />
                <div className="text-[12px] line-clamp-2 leading-snug">{book.title}</div>
                <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>{book.author}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
