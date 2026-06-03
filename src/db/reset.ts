// Wipes the database back to seed state. Safe to re-run.
import { db, schema } from "./index";

async function main() {
  console.log("Resetting ReadLeague data…");
  // Order matters because of FKs
  await db.delete(schema.bookUnlocks);
  await db.delete(schema.readingSessions);
  await db.delete(schema.userProgress);
  await db.delete(schema.userBadges);
  await db.delete(schema.announcements);
  await db.delete(schema.leagueCycles);
  await db.delete(schema.books);
  await db.delete(schema.users);
  await db.delete(schema.leagues);
  console.log("  ✓ Cleared");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
