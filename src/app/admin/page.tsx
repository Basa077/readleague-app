import Link from "next/link";
import { db, schema } from "@/db";
import { eq, desc, sql, gte, count } from "drizzle-orm";

export default async function AdminDashboard() {
  const [readerCountRow] = await db
    .select({ c: count() })
    .from(schema.users)
    .where(eq(schema.users.role, "reader"));
  const [bookCountRow] = await db
    .select({ c: count() })
    .from(schema.books)
    .where(eq(schema.books.status, "approved"));
  const [pendingCountRow] = await db
    .select({ c: count() })
    .from(schema.books)
    .where(eq(schema.books.status, "pending"));
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [sessionCountRow] = await db
    .select({ c: count(), pts: sql<number>`COALESCE(SUM(${schema.readingSessions.pts}), 0)::int` })
    .from(schema.readingSessions)
    .where(gte(schema.readingSessions.createdAt, since));

  const topReaders = await db
    .select({
      id: schema.users.id,
      displayName: schema.users.displayName,
      weeklyPts: schema.users.weeklyPts,
      leagueId: schema.users.leagueId,
    })
    .from(schema.users)
    .where(eq(schema.users.role, "reader"))
    .orderBy(desc(schema.users.weeklyPts))
    .limit(8);

  const recentSessions = await db
    .select({ session: schema.readingSessions, book: schema.books, user: schema.users })
    .from(schema.readingSessions)
    .innerJoin(schema.books, eq(schema.books.id, schema.readingSessions.bookId))
    .innerJoin(schema.users, eq(schema.users.id, schema.readingSessions.userId))
    .orderBy(desc(schema.readingSessions.createdAt))
    .limit(10);

  return (
    <div className="p-6 space-y-6 rl-fadeup">
      <div className="flex items-center justify-between">
        <h1 className="rl-serif text-2xl">Dashboard</h1>
        <div className="text-xs" style={{ color: "var(--ink-3)" }}>Last 7 days</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Readers" value={readerCountRow.c} />
        <Kpi label="Approved books" value={bookCountRow.c} />
        <Kpi label="Pending" value={pendingCountRow.c} href="/admin/approvals" />
        <Kpi label="Sessions / week" value={sessionCountRow.c} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rl-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="rl-serif text-lg">Top of the week</div>
            <Link href="/admin/ladder" className="text-xs" style={{ color: "var(--accent-ink)" }}>Ladder →</Link>
          </div>
          <div className="space-y-2 text-sm">
            {topReaders.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rl-mono text-xs w-5 text-right" style={{ color: "var(--ink-3)" }}>{i + 1}</span>
                  <span>{r.displayName}</span>
                  <span className="rl-pill">{r.leagueId ?? "—"}</span>
                </div>
                <span className="rl-mono">{r.weeklyPts} pts</span>
              </div>
            ))}
            {topReaders.length === 0 && (
              <div className="text-xs" style={{ color: "var(--ink-3)" }}>No readers yet.</div>
            )}
          </div>
        </div>

        <div className="rl-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="rl-serif text-lg">Latest sessions</div>
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>{sessionCountRow.pts} pts total</span>
          </div>
          <div className="space-y-2 text-sm">
            {recentSessions.map(({ session, book, user }) => (
              <div key={session.id} className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="line-clamp-1">{user.displayName} · <span style={{ color: "var(--ink-3)" }}>{book.title}</span></div>
                  <div className="text-xs" style={{ color: "var(--ink-3)" }}>{session.pagesRead}p · {session.minutes}m</div>
                </div>
                <div className="rl-mono text-xs" style={{ color: "var(--accent-ink)" }}>+{session.pts}</div>
              </div>
            ))}
            {recentSessions.length === 0 && (
              <div className="text-xs" style={{ color: "var(--ink-3)" }}>No sessions yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className="rl-card p-4">
      <div className="rl-serif text-3xl">{value}</div>
      <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "var(--ink-3)" }}>{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
