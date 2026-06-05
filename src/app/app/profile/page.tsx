import Link from "next/link";
import { db, schema } from "@/db";
import { eq, desc, gte } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { TourReplayButton } from "@/components/TourReplayButton";
import { Sparkline, BarChart } from "@/components/charts";
import { BADGES, earnedBadges } from "@/lib/badges";

function daysAgo(n: number) { return new Date(Date.now() - n * 86400_000); }

export default async function ProfilePage() {
  const user = await requireUser();
  const [league] = user.leagueId
    ? await db.select().from(schema.leagues).where(eq(schema.leagues.id, user.leagueId)).limit(1)
    : [null];

  // last 30 days of sessions, for charts
  const sessions = await db
    .select()
    .from(schema.readingSessions)
    .where(eq(schema.readingSessions.userId, user.id))
    .orderBy(desc(schema.readingSessions.createdAt))
    .limit(200);

  const last30 = sessions.filter((s) => new Date(s.createdAt) >= daysAgo(30));
  const totalPagesLast30 = last30.reduce((a, s) => a + s.pagesRead, 0);
  const totalMinutesLast30 = last30.reduce((a, s) => a + s.minutes, 0);
  const avgPace = totalMinutesLast30 > 0 ? (totalPagesLast30 / totalMinutesLast30).toFixed(1) : "—";
  const avgPtsPerSession = last30.length > 0 ? (last30.reduce((a, s) => a + s.pts, 0) / last30.length).toFixed(1) : "—";

  // Per-day buckets for last 14 days (oldest left → today right)
  const dayBuckets = Array(14).fill(0);
  const minuteBuckets = Array(14).fill(0);
  for (const s of last30) {
    const d = Math.floor((Date.now() - new Date(s.createdAt).getTime()) / 86400_000);
    if (d < 14) {
      dayBuckets[13 - d] += s.pagesRead;
      minuteBuckets[13 - d] += s.minutes;
    }
  }

  // Reading speed (pages/min) over the last 12 sessions for a sparkline
  const speedHistory = sessions
    .slice(0, 12)
    .reverse()
    .map((s) => (s.minutes > 0 ? +(s.pagesRead / s.minutes).toFixed(2) : 0));

  // Recent
  const recent = await db
    .select({ session: schema.readingSessions, book: schema.books })
    .from(schema.readingSessions)
    .innerJoin(schema.books, eq(schema.books.id, schema.readingSessions.bookId))
    .where(eq(schema.readingSessions.userId, user.id))
    .orderBy(desc(schema.readingSessions.createdAt))
    .limit(8);

  const recentUploads = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.uploaderId, user.id))
    .orderBy(desc(schema.books.createdAt))
    .limit(5);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-4xl mx-auto space-y-6 rl-fadeup">
      {/* Header */}
      <div className="rl-card rl-hero-gradient p-5 sm:p-7 flex items-center gap-5">
        <div
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center rl-serif text-3xl shrink-0"
          style={{ background: "var(--accent)", color: "var(--paper)" }}
        >
          {user.displayName.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="rl-serif text-2xl sm:text-3xl truncate">{user.displayName}</h1>
          <div className="text-sm" style={{ color: "var(--ink-2)" }}>@{user.handle}</div>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {league && <span className="rl-pill is-active">{league.name}</span>}
            {user.streak > 0 && <span className="rl-pill">🔥 {user.streak}d streak</span>}
            {user.tickets > 0 && <span className="rl-pill" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>🎟 {user.tickets} tickets</span>}
            {user.booksUploaded > 0 && <span className="rl-pill">📚 {user.booksUploaded} uploads</span>}
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Weekly pts" value={user.weeklyPts} />
        <Stat label="Total pts" value={user.totalPts} />
        <Stat label="Books finished" value={user.booksRead} />
        <Stat label="Streak (days)" value={user.streak} />
      </div>

      {/* Charts */}
      {last30.length === 0 ? (
        <section className="rl-card p-8 text-center space-y-2">
          <div className="text-2xl" aria-hidden>📊</div>
          <div className="rl-serif text-lg">Your reading stats live here</div>
          <p className="text-sm" style={{ color: "var(--ink-2)" }}>
            Open a book and log a session — pages per day, reading speed and your weekly form
            will start filling in.
          </p>
          <Link href="/app" className="rl-btn inline-block mt-1">Find a book</Link>
        </section>
      ) : (
      <>
      <section className="grid lg:grid-cols-3 gap-4">
        <div className="rl-card p-4 lg:col-span-2">
          <div className="flex items-baseline justify-between mb-2">
            <div>
              <div className="rl-serif text-lg leading-tight">Pages per day</div>
              <div className="text-xs" style={{ color: "var(--ink-3)" }}>Last 14 days</div>
            </div>
            <div className="text-right">
              <div className="rl-mono text-sm">{totalPagesLast30} pages</div>
              <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>30-day total</div>
            </div>
          </div>
          <BarChart data={dayBuckets} labels={Array(14).fill(0).map((_, i) => i === 0 ? "14d" : i === 13 ? "today" : "")} />
        </div>

        <div className="rl-card p-4">
          <div className="rl-serif text-lg leading-tight">Reading speed</div>
          <div className="text-xs" style={{ color: "var(--ink-3)" }}>Pages per minute, last 12 sessions</div>
          <div className="rl-mono text-2xl mt-2">{avgPace}</div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>30-day average</div>
          <div className="mt-3">
            <Sparkline data={speedHistory} />
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        <div className="rl-card p-4">
          <div className="rl-serif text-lg leading-tight">Minutes per day</div>
          <div className="text-xs" style={{ color: "var(--ink-3)" }}>Active reading time, last 14 days</div>
          <div className="mt-2"><BarChart data={minuteBuckets} color="var(--amber)" /></div>
          <div className="rl-mono text-xs mt-1" style={{ color: "var(--ink-3)" }}>
            {totalMinutesLast30} min total · {(totalMinutesLast30 / Math.max(1, last30.length)).toFixed(0)} avg / session
          </div>
        </div>
        <div className="rl-card p-4">
          <div className="rl-serif text-lg leading-tight">Form</div>
          <div className="text-xs" style={{ color: "var(--ink-3)" }}>Points earned per session (football style)</div>
          <div className="flex items-baseline gap-3 mt-2">
            <div className="rl-mono text-3xl">{avgPtsPerSession}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>avg/session · max 3</div>
          </div>
          <div className="mt-3 flex gap-1">
            {sessions.slice(0, 12).reverse().map((s, i) => (
              <div key={i} className="w-3 h-6 rounded-sm" style={{ background: s.pts >= 3 ? "var(--accent)" : s.pts >= 2 ? "var(--accent-soft)" : s.pts >= 1 ? "var(--paper-3)" : "var(--line)" }} title={`${s.pts} pts`} />
            ))}
          </div>
        </div>
      </section>
      </>
      )}

      {/* Badges */}
      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="rl-serif text-2xl">Badges</h2>
          <span className="text-xs rl-mono" style={{ color: "var(--ink-3)" }}>
            {earnedBadges(user).length} / {BADGES.length}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          {BADGES.map((b) => {
            const got = b.earned(user);
            return (
              <div
                key={b.slug}
                className="rl-card p-3 text-center"
                title={got ? b.name : b.hint}
                style={{ opacity: got ? 1 : 0.5 }}
              >
                <div className="text-2xl" style={{ filter: got ? "none" : "grayscale(1)" }} aria-hidden>{b.icon}</div>
                <div className="text-[11px] mt-1 font-medium leading-tight">{b.name}</div>
                <div className="text-[9px] mt-0.5 leading-tight" style={{ color: "var(--ink-3)" }}>
                  {got ? "Earned" : b.hint}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="rl-serif text-2xl mb-3">Recent sessions</h2>
        <div className="rl-card divide-y" style={{ borderColor: "var(--line)" }}>
          {recent.map(({ session, book }) => (
            <Link key={session.id} href={`/app/books/${book.id}`} className="p-3 flex items-center justify-between text-sm hover:bg-[var(--paper-3)] transition">
              <div className="min-w-0">
                <div className="font-medium line-clamp-1">{book.title}</div>
                <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                  {session.pagesRead}p · {session.minutes}m · {new Date(session.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="rl-mono text-xs" style={{ color: "var(--accent-ink)" }}>+{session.pts}</div>
            </Link>
          ))}
          {recent.length === 0 && <div className="p-4 text-xs" style={{ color: "var(--ink-3)" }}>No sessions yet — open a book to log one.</div>}
        </div>
      </section>

      {recentUploads.length > 0 && (
        <section>
          <h2 className="rl-serif text-2xl mb-3">Your contributions</h2>
          <div className="rl-card divide-y" style={{ borderColor: "var(--line)" }}>
            {recentUploads.map((b) => (
              <div key={b.id} className="p-3 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-medium line-clamp-1">{b.title}</div>
                  <div className="text-xs" style={{ color: "var(--ink-3)" }}>{b.author}</div>
                </div>
                <span className={`rl-pill ${b.status === "approved" ? "is-active" : ""}`}>{b.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="pt-2 grid sm:grid-cols-2 gap-2">
        <TourReplayButton className="rl-btn w-full" />
        <LogoutButton className="rl-btn w-full" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rl-card p-4 text-center">
      <div className="rl-serif text-2xl sm:text-3xl">{value}</div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>{label}</div>
    </div>
  );
}
