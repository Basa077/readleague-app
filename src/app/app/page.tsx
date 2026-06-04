import Link from "next/link";
import { db, schema } from "@/db";
import { and, eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { BookCover } from "@/components/BookCover";
import { BookShelf } from "@/components/BookShelf";
import { SearchBar } from "@/components/SearchBar";
import { canUserReadBook } from "@/lib/unlock";

const GENRE_LABELS: Record<string, string> = {
  fiction: "Fiction",
  nonfic: "Non-Fiction",
  sci: "Science",
  history: "History",
  self: "Self-Help",
  poetry: "Poetry",
  academic: "Academic",
};

export default async function DiscoverPage() {
  const user = await requireUser();

  // Books
  const approvedBooks = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.status, "approved"))
    .orderBy(desc(schema.books.createdAt));

  const enriched = await Promise.all(
    approvedBooks.map(async (b) => ({
      ...b,
      locked: !(await canUserReadBook(user, b)),
    }))
  );

  // Continue reading
  const inProgress = await db
    .select({ progress: schema.userProgress, book: schema.books })
    .from(schema.userProgress)
    .innerJoin(schema.books, eq(schema.books.id, schema.userProgress.bookId))
    .where(and(eq(schema.userProgress.userId, user.id), eq(schema.userProgress.finished, false)))
    .orderBy(desc(schema.userProgress.lastReadAt))
    .limit(5);

  // Recent sessions
  const recent = await db
    .select({ session: schema.readingSessions, book: schema.books })
    .from(schema.readingSessions)
    .innerJoin(schema.books, eq(schema.books.id, schema.readingSessions.bookId))
    .where(eq(schema.readingSessions.userId, user.id))
    .orderBy(desc(schema.readingSessions.createdAt))
    .limit(5);

  const announcements = await db
    .select()
    .from(schema.announcements)
    .orderBy(desc(schema.announcements.createdAt))
    .limit(3);

  // Hero book = first continue-reading, else first new book
  const heroProgress = inProgress[0];
  const heroBook = heroProgress?.book ?? enriched[0];
  const heroIsReward = !!(heroBook && heroBook.lockType !== "open" && !enriched.find((e) => e.id === heroBook.id)?.locked);

  // Group by genre
  const byGenre = new Map<string, typeof enriched>();
  for (const b of enriched) {
    if (!byGenre.has(b.genre)) byGenre.set(b.genre, []);
    byGenre.get(b.genre)!.push(b);
  }

  const newReleases = enriched.slice(0, 12);
  const lockedRewards = enriched.filter((b) => b.locked);
  const unlockedRewards = enriched.filter((b) => !b.locked && b.lockType !== "open");

  const [league] = user.leagueId
    ? await db.select().from(schema.leagues).where(eq(schema.leagues.id, user.leagueId)).limit(1)
    : [null];

  return (
    <div className="space-y-6 sm:space-y-8 pb-2 rl-fadeup">
      {/* Search */}
      <section className="px-4 sm:px-6 pt-4 sm:pt-6">
        <SearchBar />
      </section>

      {/* Hero */}
      <section className="px-4 sm:px-6">
        <div className="rl-card rl-hero-gradient p-5 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
              {heroProgress ? "Continue reading" : "Hi " + user.displayName.split(" ")[0]}
            </div>
            <h1 className="rl-serif text-3xl sm:text-4xl leading-[1.05]">
              {heroBook?.title ?? "Pick up a book"}
            </h1>
            <div className="text-sm" style={{ color: "var(--ink-2)" }}>
              {heroBook?.author ?? "Your league awaits"}
            </div>
            {heroProgress?.book && heroProgress.book.pages && (
              <div className="space-y-1.5">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--paper-3)" }}>
                  <div style={{ width: `${Math.round((heroProgress.progress.currentPage / heroProgress.book.pages) * 100)}%`, background: "var(--accent)", height: "100%" }} />
                </div>
                <div className="text-[11px] rl-mono" style={{ color: "var(--ink-3)" }}>
                  {heroProgress.progress.currentPage} / {heroProgress.book.pages}
                </div>
              </div>
            )}
            {heroBook && (
              <div className="flex gap-2 pt-1">
                <Link
                  href={heroBook.fileUrl ? `/app/read/${heroBook.id}` : `/app/books/${heroBook.id}`}
                  className="rl-btn rl-btn-primary"
                >
                  {heroBook.fileUrl ? (heroProgress ? "Continue" : "Open book") : "View details"}
                </Link>
                <Link href={`/app/books/${heroBook.id}`} className="rl-btn">Details</Link>
              </div>
            )}
          </div>
          {heroBook && (
            <BookCover title={heroBook.title} author={heroBook.author} genre={heroBook.genre} size={140} reward={heroIsReward} />
          )}
        </div>
      </section>

      {/* Stats strip */}
      <section className="px-4 sm:px-6 grid grid-cols-4 gap-2 sm:gap-3">
        <Stat label="This week" value={user.weeklyPts} suffix="pts" />
        <Stat label="Total" value={user.totalPts} suffix="pts" />
        <Stat label="Books" value={user.booksRead} suffix="done" />
        <Stat label="Tickets" value={user.tickets} suffix="🎟" tone={user.tickets > 0 ? "accent" : undefined} />
      </section>

      {/* League card */}
      {league && (
        <section className="px-4 sm:px-6">
          <Link href="/app/leagues" className="rl-card p-4 flex items-center justify-between hover:bg-[var(--paper-3)] transition">
            <div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Your league</div>
              <div className="rl-serif text-xl">{league.name}</div>
              <div className="text-xs" style={{ color: "var(--ink-3)" }}>Champion title: <span className="rl-mono">{league.championTitle}</span></div>
            </div>
            <div className="text-right">
              <div className="rl-mono text-xs" style={{ color: "var(--ink-3)" }}>tier</div>
              <div className="rl-serif text-2xl" style={{ color: "var(--accent-ink)" }}>{league.tier}</div>
            </div>
          </Link>
        </section>
      )}

      {announcements.length > 0 && (
        <section className="px-4 sm:px-6 space-y-2">
          <div className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>From the coordinator</div>
          {announcements.map((a) => (
            <div key={a.id} className="rl-card p-3">
              <div className="font-medium text-sm">{a.title}</div>
              <div className="text-xs mt-1" style={{ color: "var(--ink-2)" }}>{a.body}</div>
            </div>
          ))}
        </section>
      )}

      {inProgress.length > 0 && (
        <BookShelf
          title="Continue reading"
          subtitle="Pick up where you left off"
          books={inProgress.map(({ book }) => ({
            id: book.id,
            title: book.title,
            author: book.author,
            genre: book.genre,
            href: book.fileUrl ? `/app/read/${book.id}` : `/app/books/${book.id}`,
          }))}
        />
      )}

      {unlockedRewards.length > 0 && (
        <BookShelf
          title="Your rewards"
          subtitle="Books you unlocked by climbing"
          books={unlockedRewards.map((b) => ({ id: b.id, title: b.title, author: b.author, genre: b.genre, reward: true }))}
        />
      )}

      {lockedRewards.length > 0 && (
        <section className="space-y-2">
          <div className="px-4 sm:px-6 flex items-baseline justify-between">
            <div>
              <h3 className="rl-serif text-lg">Locked rewards</h3>
              <div className="text-xs" style={{ color: "var(--ink-3)" }}>Win your league cycle to unlock</div>
            </div>
            <span className="rl-pill rl-foil text-[10px]" style={{ color: "#1A1208" }}>🏆 prize</span>
          </div>
          <div className="overflow-x-auto rl-scroll">
            <div className="flex gap-3 px-4 sm:px-6 pb-2" style={{ width: "max-content" }}>
              {lockedRewards.map((b) => (
                <Link key={b.id} href={`/app/books/${b.id}`} className="flex-shrink-0" style={{ width: 124 }}>
                  <BookCover title={b.title} author={b.author} genre={b.genre} size={124} locked />
                  <div className="mt-2 text-[12px] line-clamp-2 leading-snug" style={{ width: 124 }}>{b.title}</div>
                  <div className="text-[10px]" style={{ color: "var(--accent-ink)" }}>{b.lockNote ?? "Reward"}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <BookShelf title="New on ReadLeague" subtitle="Fresh adds across all genres" books={newReleases} />

      {[...byGenre.entries()].map(([genre, list]) => (
        <BookShelf
          key={genre}
          title={GENRE_LABELS[genre] ?? genre}
          subtitle={`${list.length} books`}
          books={list.slice(0, 10)}
        />
      ))}

      {recent.length > 0 && (
        <section className="px-4 sm:px-6">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="rl-serif text-lg">Recent sessions</h3>
            <Link href="/app/profile" className="text-xs" style={{ color: "var(--accent-ink)" }}>All →</Link>
          </div>
          <div className="rl-card divide-y" style={{ borderColor: "var(--line)" }}>
            {recent.map(({ session, book }) => (
              <div key={session.id} className="p-3 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-medium line-clamp-1">{book.title}</div>
                  <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                    {session.pagesRead} pages · {session.minutes} min · {new Date(session.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="rl-mono text-xs" style={{ color: "var(--accent-ink)" }}>+{session.pts}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: number; suffix: string; tone?: "accent" }) {
  return (
    <div className="rl-card p-3 text-center">
      <div className="rl-serif text-xl sm:text-2xl" style={tone === "accent" ? { color: "var(--accent-ink)" } : undefined}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
        {label} <span className="rl-mono">{suffix}</span>
      </div>
    </div>
  );
}
