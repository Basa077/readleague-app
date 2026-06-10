// Expand the league ladder in-place on an existing database.
//
// Seeds every tier in LEAGUE_LADDER (Tuareg → Lunda) and re-numbers tiers so the
// whole 20-deep ladder is live, with the entry tier at the bottom and the most
// prestigious leagues above. Non-destructive: users reference a league by its
// string id, never by tier, so renumbering is safe. Run: `npm run db:leagues`.
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { LEAGUE_LADDER } from "@/lib/leagues";

async function main() {
  const before = await db.select().from(schema.leagues);
  console.log(`Leagues before: ${before.length} (${before.map((l) => l.id).join(", ")})`);

  let added = 0;
  let updated = 0;
  for (let i = 0; i < LEAGUE_LADDER.length; i++) {
    const l = LEAGUE_LADDER[i];
    const tier = LEAGUE_LADDER.length - i; // tuareg=20 (entry) … lunda=1 (top)
    const existing = before.find((b) => b.id === l.id);
    if (!existing) {
      await db.insert(schema.leagues).values({
        id: l.id,
        name: l.name,
        championTitle: l.championTitle,
        threshold: l.threshold,
        uploadsRequired: l.uploadsRequired,
        tier,
      }).onConflictDoNothing();
      added++;
    } else {
      await db.update(schema.leagues).set({
        name: l.name,
        championTitle: l.championTitle,
        threshold: l.threshold,
        uploadsRequired: l.uploadsRequired,
        tier,
      }).where(eq(schema.leagues.id, l.id));
      updated++;
    }
  }

  const after = await db.select().from(schema.leagues).orderBy(schema.leagues.tier);
  console.log(`Added ${added}, re-aligned ${updated}. Ladder is now ${after.length} tiers:`);
  for (const l of after) console.log(`  tier ${String(l.tier).padStart(2)} · ${l.name} (${l.championTitle})`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
