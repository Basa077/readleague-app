import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import type { Book, User } from "@/db/schema";

/** True if the user has a successful purchase of this book. */
export async function hasPurchased(userId: number, bookId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.purchases.id })
    .from(schema.purchases)
    .where(and(eq(schema.purchases.userId, userId), eq(schema.purchases.bookId, bookId), eq(schema.purchases.status, "success")))
    .limit(1);
  return !!row;
}

/**
 * Returns true if `user` may read `book`.
 *  - Paid books (price_ghs > 0): the uploader & coordinators always can; everyone
 *    else needs a successful purchase.
 *  - Free books fall back to lock_type:
 *      open → anyone; otherwise an entry in book_unlocks (league reward / grant).
 */
export async function canUserReadBook(user: User, book: Book): Promise<boolean> {
  if ((book.priceGhs ?? 0) > 0) {
    if (user.role === "coordinator" || book.uploaderId === user.id) return true;
    return hasPurchased(user.id, book.id);
  }
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
