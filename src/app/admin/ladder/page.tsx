import { db, schema } from "@/db";
import { eq, desc, asc } from "drizzle-orm";

export default async function LadderPage() {
  const leagues = await db.select().from(schema.leagues).orderBy(asc(schema.leagues.tier));

  const groups = await Promise.all(
    leagues.map(async (league) => {
      const members = await db
        .select({
          id: schema.users.id,
          displayName: schema.users.displayName,
          handle: schema.users.handle,
          weeklyPts: schema.users.weeklyPts,
          totalPts: schema.users.totalPts,
          tickets: schema.users.tickets,
        })
        .from(schema.users)
        .where(eq(schema.users.leagueId, league.id))
        .orderBy(desc(schema.users.weeklyPts));
      return { league, members };
    })
  );

  return (
    <div className="p-6 space-y-6 rl-fadeup">
      <div className="flex items-baseline justify-between">
        <h1 className="rl-serif text-2xl">Ladder</h1>
        <div className="text-xs" style={{ color: "var(--ink-3)" }}>{leagues.length} active leagues</div>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map(({ league, members }) => (
          <div key={league.id} className="rl-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="rl-serif text-lg">{league.name}</div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
                  Tier {league.tier} · {members.length} members · ≥{league.uploadsRequired} uploads = 🎟
                </div>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--line)" }}>
              {members.map((m, i) => {
                const rank = i + 1;
                const isTop = rank === 1;
                const isRelegating = rank > members.length - 3 && members.length >= 4;
                return (
                  <div key={m.id} className="py-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="rl-mono text-xs w-5 text-right" style={{ color: isTop ? "var(--accent-ink)" : "var(--ink-3)" }}>{rank}</span>
                      <div className="min-w-0">
                        <div className="truncate">{m.displayName}</div>
                        <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>@{m.handle}</div>
                      </div>
                      {m.tickets > 0 && <span className="text-[10px]" title="Promotion tickets">🎟{m.tickets}</span>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="rl-mono text-xs">{m.weeklyPts} pts</div>
                      <div className="text-[10px]" style={{ color: isTop ? "var(--accent-ink)" : isRelegating ? "var(--danger)" : "var(--ink-3)" }}>
                        {isTop ? "↑ promote" : isRelegating ? "↓ relegate" : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
              {members.length === 0 && <div className="py-2 text-xs" style={{ color: "var(--ink-3)" }}>No members.</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
