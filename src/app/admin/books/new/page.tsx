import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { NewBookForm } from "./NewBookForm";

export default async function NewBookPage() {
  const leagues = await db.select().from(schema.leagues).orderBy(asc(schema.leagues.tier));
  return (
    <div className="p-6 max-w-3xl space-y-4 rl-fadeup">
      <h1 className="rl-serif text-3xl">Add a book</h1>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        Coordinator-added books are approved immediately. Attach a PDF or EPUB so readers can open
        it in the app — or skip the file for a metadata-only listing. Set a lock now if this book
        is meant as a league reward.
      </p>
      <NewBookForm leagues={leagues.map((l) => ({ id: l.id, name: l.name }))} />
    </div>
  );
}
