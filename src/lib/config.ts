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

/** Max size for a feed image (uploaded browser → Vercel Blob, same as books). */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

/** Max size for a feed/story video clip (Vercel Blob). Keep clips short. */
export const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60 MB

/** Whether feed video uploads are wired up (Cloudflare Stream). Gated on creds
 *  so the UI only offers video once the account is configured — see
 *  SETUP-CLOUDFLARE.md. Mirrors the Google sign-in gating pattern. */
export const CLOUDFLARE_STREAM_ENABLED = Boolean(
  process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_STREAM_TOKEN
);
