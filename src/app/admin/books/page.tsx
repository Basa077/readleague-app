import Link from "next/link";
import { db, schema } from "@/db";
import { eq, desc, ne } from "drizzle-orm";
import { BookCover } from "@/components/BookCover";
import { lockDescription } from "@/lib/unlock";

export default async function AdminBooksPage() {
  const books = await db
    .select()
    .from(schema.books)
    .where(ne(schema.books.status, "rejected"))
    .orderBy(desc(schema.books.createdAt));

  return (
    <div className="p-6 space-y-4 rl-fadeup">
      <div className="flex items-center justify-between">
        <h1 className="rl-serif text-2xl">Books</h1>
        <div className="flex items-center gap-3">
          <div className="text-xs" style={{ color: "var(--ink-3)" }}>{books.length} total</div>
          <Link href="/admin/books/new" className="rl-btn rl-btn-primary text-xs">+ New book</Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {books.map((b) => (
          <Link key={b.id} href={`/admin/books/${b.id}`} className="rl-card p-3 flex gap-3 hover:bg-[var(--paper-3)]">
            <BookCover title={b.title} author={b.author} genre={b.genre} size={56} locked={b.lockType !== "open"} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm line-clamp-1">{b.title}</div>
              <div className="text-xs" style={{ color: "var(--ink-3)" }}>{b.author}</div>
              <div className="text-[10px] mt-2" style={{ color: b.lockType === "open" ? "var(--ink-3)" : "var(--accent-ink)" }}>
                {lockDescription(b)}
              </div>
              {b.status !== "approved" && (
                <span className="rl-pill mt-2 inline-flex">{b.status}</span>
              )}
            </div>
          </Link>
        ))}
        {books.length === 0 && (
          <div className="text-sm col-span-full" style={{ color: "var(--ink-3)" }}>No books yet.</div>
        )}
      </div>
    </div>
  );
}
