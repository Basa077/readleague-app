import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import type { Book, User } from "@/db/schema";

/**
 * Returns true if `user` may read `book` given its lock_type.
 *  - open:           anyone
 *  - league_winner:  user must have an entry in book_unlocks (auto-granted at cycle close)
 *  - league_top_n:   same — granted at cycle close to top-N finishers
 *  - admin_grant:    same — granted manually by coordinator
 */
export async function canUserReadBook(user: User, book: Book): Promise<boolean> {
  if (book.lockType === "open") return true;
  const [row] = await db
    .select({ id: schema.bookUnlocks.id })
    .from(schema.bookUnlocks)
    .where(and(eq(schema.bookUnlocks.userId, user.id), eq(schema.bookUnlocks.bookId, book.id)))
    .limit(1);
  return !!row;
}

export function lockDescription(book: Book): string {
  switch (book.lockType) {
    case "open":
      return "Open to all readers";
    case "league_winner":
      return `Reward — win the ${formatLeague(book.lockLeagueId)} weekly cycle`;
    case "league_top_n":
      return `Reward — finish top ${book.lockPosition ?? 4} in ${formatLeague(book.lockLeagueId)}`;
    case "admin_grant":
      return book.lockNote || "Granted by coordinator";
  }
}

function formatLeague(id: string | null): string {
  if (!id) return "any league";
  return id.charAt(0).toUpperCase() + id.slice(1) + " League";
}
