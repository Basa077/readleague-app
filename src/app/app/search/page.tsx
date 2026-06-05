import Link from "next/link";
import { db, schema } from "@/db";
import { and, eq, or, ilike, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { BookCover } from "@/components/BookCover";
import { SearchBar } from "@/components/SearchBar";
import { RequestBook } from "@/components/RequestBook";
import { canUserReadBook } from "@/lib/unlock";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const q = ((await searchParams).q || "").trim();

  const results = q
    ? await db
        .select()
        .from(schema.books)
        .where(
          and(
            eq(schema.books.status, "approved"),
            or(ilike(schema.books.title, `%${q}%`), ilike(schema.books.author, `%${q}%`))
          )
        )
        .orderBy(desc(schema.books.createdAt))
        .limit(60)
    : [];

  const enriched = await Promise.all(results.map(async (b) => ({ ...b, locked: !(await canUserReadBook(user, b)) })));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6 rl-fadeup">
      <header className="space-y-3">
        <h1 className="rl-serif text-3xl">Find a book</h1>
        <SearchBar defaultValue={q} autoFocus />
      </header>

      {q && (
        enriched.length > 0 ? (
          <section className="space-y-3">
            <div className="text-xs" style={{ color: "var(--ink-3)" }}>
              {enriched.length} result{enriched.length === 1 ? "" : "s"} for “{q}”
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {enriched.map((b) => (
                <Link
                  key={b.id}
                  href={b.fileUrl && !b.locked ? `/app/read/${b.id}` : `/app/books/${b.id}`}
                  className="space-y-1.5 group"
                >
                  <div className="transition group-hover:-translate-y-1">
                    <BookCover title={b.title} author={b.author} genre={b.genre} size={128} locked={b.locked} reward={b.lockType !== "open" && !b.locked} />
                  </div>
                  <div className="text-[12px] line-clamp-2 leading-snug">{b.title}</div>
                  <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>{b.author}</div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <RequestBook query={q} />
        )
      )}

      {!q && (
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          Type a title or author above to search the library.
        </p>
      )}
    </div>
  );
}
