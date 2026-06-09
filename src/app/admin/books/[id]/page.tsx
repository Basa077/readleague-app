import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { eq, desc, asc } from "drizzle-orm";
import { BookCover } from "@/components/BookCover";
import { LockEditor } from "./LockEditor";
import { GrantUnlockForm } from "./GrantUnlockForm";
import { PriceEditor } from "./PriceEditor";

export default async function AdminBookDetail(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const bookId = Number(id);
  if (!bookId) notFound();

  const [book] = await db.select().from(schema.books).where(eq(schema.books.id, bookId)).limit(1);
  if (!book) notFound();

  const leagues = await db.select().from(schema.leagues).orderBy(asc(schema.leagues.tier));

  const unlocks = await db
    .select({ unlock: schema.bookUnlocks, user: schema.users })
    .from(schema.bookUnlocks)
    .innerJoin(schema.users, eq(schema.users.id, schema.bookUnlocks.userId))
    .where(eq(schema.bookUnlocks.bookId, book.id))
    .orderBy(desc(schema.bookUnlocks.grantedAt));

  const readers = await db
    .select({ id: schema.users.id, displayName: schema.users.displayName, handle: schema.users.handle })
    .from(schema.users)
    .where(eq(schema.users.role, "reader"));

  return (
    <div className="p-6 max-w-3xl space-y-5 rl-fadeup">
      <div className="flex gap-4">
        <BookCover title={book.title} author={book.author} genre={book.genre} size={140} locked={book.lockType !== "open"} />
        <div className="flex-1 min-w-0">
          <h1 className="rl-serif text-2xl leading-tight">{book.title}</h1>
          <div className="text-sm" style={{ color: "var(--ink-2)" }}>{book.author}</div>
          <div className="flex gap-1 mt-2 flex-wrap">
            <span className="rl-pill">{book.genre}</span>
            {book.pages != null && <span className="rl-pill">{book.pages}p</span>}
            {book.format && <span className="rl-pill">{book.format}</span>}
            <span className="rl-pill">{book.status}</span>
          </div>
          {book.fileUrl && (
            <a href={book.fileUrl} target="_blank" rel="noopener" className="text-xs mt-2 inline-block" style={{ color: "var(--accent-ink)" }}>
              File attached ↗
            </a>
          )}
        </div>
      </div>

      <section className="rl-card p-4 space-y-3">
        <div className="rl-serif text-lg">Unlock requirement</div>
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Locked books only appear in libraries of readers who&apos;ve unlocked them. Promote a
          book to a reward by tying it to a league outcome — the system grants unlocks when
          you close the weekly cycle.
        </p>
        <LockEditor book={book} leagues={leagues.map((l) => l.id)} />
      </section>

      <section className="rl-card p-4 space-y-3">
        <div className="rl-serif text-lg">Price &amp; selling</div>
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Set a price to sell this book. Readers pay once with Mobile Money or card (Paystack)
          and then own it. A price above 0 overrides league locks — anyone who buys can read.
        </p>
        <PriceEditor book={book} />
      </section>

      <section className="rl-card p-4 space-y-3">
        <div className="rl-serif text-lg">Grant manually</div>
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Give a specific reader access to this book — useful for one-off rewards or fixing mistakes.
        </p>
        <GrantUnlockForm bookId={book.id} readers={readers} />
      </section>

      <section>
        <div className="rl-serif text-lg mb-2">Granted to · {unlocks.length}</div>
        <div className="rl-card divide-y" style={{ borderColor: "var(--line)" }}>
          {unlocks.map(({ unlock, user }) => (
            <div key={unlock.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{user.displayName}</div>
                <div className="text-xs" style={{ color: "var(--ink-3)" }}>{unlock.reason}</div>
              </div>
              <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                {new Date(unlock.grantedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
          {unlocks.length === 0 && (
            <div className="p-3 text-xs" style={{ color: "var(--ink-3)" }}>Nobody has unlocked this book yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
