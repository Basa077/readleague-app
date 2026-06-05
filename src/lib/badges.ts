import type { User } from "@/db/schema";

// Badges are derived directly from a user's current stats — no separate
// awarding step to drift out of sync. Each badge knows how to test itself and
// how to describe what's still needed to earn it.

export type Badge = {
  slug: string;
  name: string;
  icon: string;
  earned: (u: User) => boolean;
  /** Short hint shown while the badge is still locked. */
  hint: string;
};

export const BADGES: Badge[] = [
  { slug: "first-book", name: "First Chapter", icon: "📖", earned: (u) => u.booksRead >= 1, hint: "Finish your first book" },
  { slug: "bookworm", name: "Bookworm", icon: "🐛", earned: (u) => u.booksRead >= 5, hint: "Finish 5 books" },
  { slug: "scholar", name: "Scholar", icon: "🎓", earned: (u) => u.booksRead >= 20, hint: "Finish 20 books" },
  { slug: "kindling", name: "Kindling", icon: "✨", earned: (u) => u.streak >= 3, hint: "Read 3 days in a row" },
  { slug: "on-fire", name: "On Fire", icon: "🔥", earned: (u) => u.streak >= 7, hint: "Keep a 7-day streak" },
  { slug: "contributor", name: "Contributor", icon: "🤝", earned: (u) => u.booksUploaded >= 1, hint: "Add a book to the library" },
  { slug: "librarian", name: "Librarian", icon: "📚", earned: (u) => u.booksUploaded >= 5, hint: "Add 5 approved books" },
  { slug: "century", name: "Century", icon: "💯", earned: (u) => u.totalPts >= 100, hint: "Earn 100 total points" },
  { slug: "ticket-holder", name: "Contender", icon: "🎟", earned: (u) => u.tickets >= 1, hint: "Earn a promotion ticket" },
];

export function earnedBadges(u: User): Badge[] {
  return BADGES.filter((b) => b.earned(u));
}

export function lockedBadges(u: User): Badge[] {
  return BADGES.filter((b) => !b.earned(u));
}
