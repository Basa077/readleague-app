import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  real,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["reader", "coordinator"]);
export const bookStatusEnum = pgEnum("book_status", ["pending", "approved", "rejected"]);
export const lockTypeEnum = pgEnum("lock_type", [
  "open",
  "league_winner",
  "league_top_n",
  "admin_grant",
]);
export const cycleStatusEnum = pgEnum("cycle_status", ["active", "closed"]);

export const leagues = pgTable("leagues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tier: integer("tier").notNull(), // 1 = top, larger = lower
  threshold: integer("threshold").notNull(),
  championTitle: text("champion_title").notNull(),
  uploadsRequired: integer("uploads_required").notNull().default(1),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull().default("reader"),
    leagueId: text("league_id").references(() => leagues.id),
    weeklyPts: integer("weekly_pts").notNull().default(0),
    totalPts: integer("total_pts").notNull().default(0),
    streak: integer("streak").notNull().default(0),
    booksRead: integer("books_read").notNull().default(0),
    booksUploaded: integer("books_uploaded").notNull().default(0), // approved uploads, all-time
    cycleUploads: integer("cycle_uploads").notNull().default(0),   // approved uploads in current cycle
    tickets: integer("tickets").notNull().default(0),              // FA-cup promotion tickets
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("users_email_idx").on(t.email),
    handleUnique: uniqueIndex("users_handle_idx").on(t.handle),
  })
);

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  genre: text("genre").notNull(),
  pages: integer("pages"),                  // null until detected from file
  format: text("format"),                   // PDF | EPUB, detected from file
  fileUrl: text("file_url"),                // Vercel Blob URL
  coverUrl: text("cover_url"),
  description: text("description"),
  year: integer("year"),
  rating: real("rating").notNull().default(0),
  readers: integer("readers").notNull().default(0),
  status: bookStatusEnum("status").notNull().default("approved"),
  uploaderId: integer("uploader_id").references(() => users.id),
  lockType: lockTypeEnum("lock_type").notNull().default("open"),
  lockLeagueId: text("lock_league_id").references(() => leagues.id),
  lockPosition: integer("lock_position"),
  lockNote: text("lock_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const bookUnlocks = pgTable(
  "book_unlocks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    cycleId: integer("cycle_id"),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userBookUnique: uniqueIndex("book_unlocks_user_book_idx").on(t.userId, t.bookId),
  })
);

export const readingSessions = pgTable("reading_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
  pagesRead: integer("pages_read").notNull(),
  minutes: integer("minutes").notNull(),
  pts: integer("pts").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userProgress = pgTable(
  "user_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    currentPage: integer("current_page").notNull().default(0),
    cfi: text("cfi"),                           // EPUB Canonical Fragment Identifier (where you stopped)
    finished: boolean("finished").notNull().default(false),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userBookUnique: uniqueIndex("user_progress_user_book_idx").on(t.userId, t.bookId),
  })
);

export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
});

export const userBadges = pgTable(
  "user_badges",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    badgeId: integer("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userBadgeUnique: uniqueIndex("user_badges_user_badge_idx").on(t.userId, t.badgeId),
  })
);

export const leagueCycles = pgTable("league_cycles", {
  id: serial("id").primaryKey(),
  leagueId: text("league_id").notNull().references(() => leagues.id),
  weekStart: timestamp("week_start", { withTimezone: true }).notNull(),
  weekEnd: timestamp("week_end", { withTimezone: true }).notNull(),
  status: cycleStatusEnum("status").notNull().default("active"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
});

// Reader highlights & notes. Private by default (only the author sees them);
// flip `shared` to surface a note to other readers of the same book — "what I
// want others to learn". PDFs store normalized rects + page; EPUBs store a CFI
// range. `kind` = 'highlight' (anchored to text) | 'note' (a comment on a page).
export const annotations = pgTable(
  "annotations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    bookId: integer("book_id").notNull().references(() => books.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("highlight"),   // 'highlight' | 'note'
    color: text("color").notNull().default("yellow"),    // yellow|green|blue|pink|purple
    page: integer("page"),                               // PDF page (1-based) or EPUB est. page
    cfiRange: text("cfi_range"),                         // EPUB highlight range
    rects: text("rects"),                                // PDF: JSON [{x,y,w,h}] normalized 0..1
    selectedText: text("selected_text"),                 // the highlighted passage (display + citation)
    note: text("note"),                                  // the reader's comment
    shared: boolean("shared").notNull().default(false),  // visible to other readers of this book
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byUserBook: index("annotations_user_book_idx").on(t.userId, t.bookId),
    byBookShared: index("annotations_book_shared_idx").on(t.bookId, t.shared),
  })
);

// ── Social feed ───────────────────────────────────────────────────────────
// A worldwide feed where readers post what they read & learnt. Text + image
// now; `videoUid`/`videoThumb` are for Cloudflare Stream (wired separately).
// A reshare is itself a post with `resharedFromId` pointing at the original.
export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    authorId: integer("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body"),                       // caption / thought
    imageUrl: text("image_url"),              // Vercel Blob image
    videoUid: text("video_uid"),              // Cloudflare Stream UID (later)
    videoThumb: text("video_thumb"),          // poster image for the video
    bookId: integer("book_id").references(() => books.id, { onDelete: "set null" }), // "I read this"
    resharedFromId: integer("reshared_from_id"), // self-ref → posts.id (no FK; handled in app)
    likeCount: integer("like_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    reshareCount: integer("reshare_count").notNull().default(0),
    hidden: boolean("hidden").notNull().default(false),   // moderation: hide from feed
    reportCount: integer("report_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byCreated: index("posts_created_idx").on(t.createdAt),
    byAuthor: index("posts_author_idx").on(t.authorId),
  })
);

export const postLikes = pgTable(
  "post_likes",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniq: uniqueIndex("post_likes_post_user_idx").on(t.postId, t.userId) })
);

export const postComments = pgTable(
  "post_comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byPost: index("post_comments_post_idx").on(t.postId) })
);

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  scope: text("scope").notNull().default("all"),
  authorId: integer("author_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Book = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type ReadingSession = typeof readingSessions.$inferSelect;
export type League = typeof leagues.$inferSelect;
export type BookUnlock = typeof bookUnlocks.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type Annotation = typeof annotations.$inferSelect;
export type NewAnnotation = typeof annotations.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type PostComment = typeof postComments.$inferSelect;
