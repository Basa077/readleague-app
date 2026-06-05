// App-wide tunables.

/**
 * Auto-added (reader-requested) books are openly readable while the library is
 * still growing. Once the catalogue reaches this many approved books, the plan
 * is to start gating newly-requested titles behind the league-unlock rules
 * instead of leaving them open. Flip the behaviour in request-book.ts when we
 * cross this line. (See the "request a book" product note.)
 */
export const AUTO_LOCK_THRESHOLD = 20000;

/**
 * Max size for an uploaded book file. Files are uploaded directly from the
 * browser to Vercel Blob (see /api/blob/upload), which bypasses the ~4.5MB
 * Serverless Function request-body limit — so this can comfortably exceed it.
 */
export const MAX_BOOK_BYTES = 50 * 1024 * 1024; // 50 MB
