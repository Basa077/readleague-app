import { db, schema } from "@/db";
import { desc } from "drizzle-orm";
import { CloseCycleButton } from "./CloseCycleButton";

export default async function CyclePage() {
  const past = await db
    .select()
    .from(schema.leagueCycles)
    .orderBy(desc(schema.leagueCycles.closedAt))
    .limit(20);

  return (
    <div className="p-6 max-w-2xl space-y-5 rl-fadeup">
      <h1 className="rl-serif text-2xl">Weekly cycle</h1>

      <div className="rl-card p-5 space-y-3">
        <div className="rl-serif text-lg">Close the current week</div>
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          Closes the week for every league: top finishers promote, bottom three
          relegate, and any books locked behind league outcomes are granted to
          the qualifying readers. Weekly points reset to zero.
        </p>
        <CloseCycleButton />
        <div className="text-[10px] rl-mono" style={{ color: "var(--ink-3)" }}>
          This action affects every active reader. Run it once per cycle.
        </div>
      </div>

      <section>
        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>
          Recently closed cycles
        </div>
        <div className="rl-card divide-y" style={{ borderColor: "var(--line)" }}>
          {past.map((c) => (
            <div key={c.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{c.leagueId}</div>
                <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                  {new Date(c.weekStart).toLocaleDateString()} → {new Date(c.weekEnd).toLocaleDateString()}
                </div>
              </div>
              <span className="rl-pill">{c.status}</span>
            </div>
          ))}
          {past.length === 0 && (
            <div className="p-3 text-xs" style={{ color: "var(--ink-3)" }}>No cycles closed yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}
