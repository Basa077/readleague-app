import { db, schema } from "@/db";
import { eq, desc, asc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export default async function LeaguesPage() {
  const user = await requireUser();
  const myLeagueId = user.leagueId ?? "tuareg";

  const leagues = await db.select().from(schema.leagues).orderBy(asc(schema.leagues.tier));
  const myLeague = leagues.find((l) => l.id === myLeagueId);

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
    .where(eq(schema.users.leagueId, myLeagueId))
    .orderBy(desc(schema.users.weeklyPts));

  const myRank = members.findIndex((m) => m.id === user.id) + 1;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-4xl mx-auto space-y-6 rl-fadeup">
      <header className="rl-card rl-hero-gradient p-5 sm:p-7">
        <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Your league · Tier {myLeague?.tier}</div>
        <h1 className="rl-serif text-3xl sm:text-4xl mt-0.5">{myLeague?.name ?? "League"}</h1>
        <div className="text-sm" style={{ color: "var(--ink-2)" }}>
          Champion title: <span className="rl-mono">{myLeague?.championTitle}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-4">
          <Stat label="Your rank" value={myRank ? `#${myRank}` : "—"} />
          <Stat label="This week" value={user.weeklyPts} suffix="pts" />
          <Stat label="Members" value={members.length} />
          <Stat label="Tickets" value={user.tickets} suffix="🎟" tone={user.tickets > 0 ? "accent" : undefined} />
        </div>
      </header>

      {myLeague && (
        <div className="rl-card p-3 text-xs" style={{ color: "var(--ink-2)" }}>
          Reach <span className="rl-mono" style={{ color: "var(--ink)" }}>{myLeague.threshold}</span> weekly pts
          to be in title contention. Approve <span className="rl-mono" style={{ color: "var(--ink)" }}>{myLeague.uploadsRequired}</span> uploaded books
          per cycle to earn a 🎟 promotion ticket (FA-Cup style).
        </div>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="rl-serif text-2xl">Weekly standings</h2>
          <span className="text-xs" style={{ color: "var(--ink-3)" }}>top promotes · bottom 3 relegate</span>
        </div>
        <div className="rl-card divide-y" style={{ borderColor: "var(--line)" }}>
          {members.map((m, i) => {
            const rank = i + 1;
            const isMe = m.id === user.id;
            const isTop = rank === 1;
            const isRelegating = rank > members.length - 3 && members.length >= 4;
            return (
              <div
                key={m.id}
                className="p-3 flex items-center justify-between text-sm"
                style={{ background: isMe ? "var(--accent-soft)" : undefined }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center rl-mono text-xs shrink-0" style={{ background: isTop ? "var(--accent)" : "var(--paper-3)", color: isTop ? "var(--paper)" : "var(--ink-2)" }}>
                    {rank}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.displayName}{isMe ? " (you)" : ""}</div>
                    <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>@{m.handle}</div>
                  </div>
                  {m.tickets > 0 && <span className="rl-pill text-[10px]" title="Has a promotion ticket">🎟 {m.tickets}</span>}
                </div>
                <div className="text-right shrink-0">
                  <div className="rl-mono text-sm">{m.weeklyPts} pts</div>
                  <div className="text-[10px]" style={{ color: isTop ? "var(--accent-ink)" : isRelegating ? "var(--danger)" : "var(--ink-3)" }}>
                    {isTop ? "↑ promote" : isRelegating ? "↓ relegate" : "—"}
                  </div>
                </div>
              </div>
            );
          })}
          {members.length === 0 && <div className="p-4 text-xs" style={{ color: "var(--ink-3)" }}>No members yet.</div>}
        </div>
      </section>

      <section>
        <h2 className="rl-serif text-2xl mb-3">League ladder</h2>
        <div className="rl-card divide-y" style={{ borderColor: "var(--line)" }}>
          {leagues.map((l) => (
            <div key={l.id} className="p-3 flex items-center justify-between text-sm" style={{ background: l.id === myLeagueId ? "var(--paper-3)" : undefined }}>
              <div>
                <div className="font-medium">{l.name}</div>
                <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>{l.championTitle} · {l.threshold}+ pts/wk · upload req: {l.uploadsRequired}</div>
              </div>
              <div className="text-xs rl-mono" style={{ color: "var(--ink-3)" }}>Tier {l.tier}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: number | string; suffix?: string; tone?: "accent" }) {
  return (
    <div className="rl-card p-2.5 text-center">
      <div className="rl-serif text-xl" style={tone === "accent" ? { color: "var(--accent-ink)" } : undefined}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>{label} {suffix && <span>{suffix}</span>}</div>
    </div>
  );
}
