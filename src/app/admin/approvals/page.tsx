import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { ApprovalRow } from "./ApprovalRow";

export default async function ApprovalsPage() {
  const pending = await db
    .select({ book: schema.books, uploader: schema.users })
    .from(schema.books)
    .leftJoin(schema.users, eq(schema.users.id, schema.books.uploaderId))
    .where(eq(schema.books.status, "pending"))
    .orderBy(desc(schema.books.createdAt));

  return (
    <div className="p-6 space-y-4 rl-fadeup">
      <div className="flex items-center justify-between">
        <h1 className="rl-serif text-2xl">Approvals</h1>
        <div className="text-xs" style={{ color: "var(--ink-3)" }}>{pending.length} pending</div>
      </div>

      <div className="rl-card divide-y" style={{ borderColor: "var(--line)" }}>
        {pending.map(({ book, uploader }) => (
          <ApprovalRow
            key={book.id}
            book={{ id: book.id, title: book.title, author: book.author, genre: book.genre, pages: book.pages ?? 0, format: book.format ?? "—" }}
            uploader={uploader ? { displayName: uploader.displayName, handle: uploader.handle } : null}
          />
        ))}
        {pending.length === 0 && (
          <div className="p-6 text-center text-sm" style={{ color: "var(--ink-3)" }}>
            Inbox zero — nothing pending.
          </div>
        )}
      </div>
    </div>
  );
}
