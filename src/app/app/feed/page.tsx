import { requireUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { listFeedAction } from "@/app/actions/feed";
import { CLOUDFLARE_STREAM_ENABLED } from "@/lib/config";
import { FeedClient } from "./FeedClient";

export default async function FeedPage() {
  const user = await requireUser();
  const initial = await listFeedAction();

  // Books the reader has opened — offered as a "tag a book" option in composer.
  const myBooks = await db
    .select({ id: schema.books.id, title: schema.books.title, author: schema.books.author })
    .from(schema.userProgress)
    .innerJoin(schema.books, eq(schema.books.id, schema.userProgress.bookId))
    .where(eq(schema.userProgress.userId, user.id))
    .orderBy(desc(schema.userProgress.lastReadAt))
    .limit(20);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <header className="mb-4">
        <h1 className="rl-serif text-2xl">The Feed</h1>
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          What readers across the world are reading &amp; learning.
        </p>
      </header>
      <FeedClient
        initial={initial}
        me={{ id: user.id, name: user.displayName, handle: user.handle, role: user.role }}
        myBooks={myBooks}
        videoEnabled={CLOUDFLARE_STREAM_ENABLED}
      />
    </div>
  );
}
