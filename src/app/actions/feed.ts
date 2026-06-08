"use server";

import { db, schema } from "@/db";
import { and, desc, eq, lt, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type FeedAuthor = { id: number; name: string; handle: string; leagueId: string | null };
export type FeedBook = { id: number; title: string; author: string };
export type FeedPost = {
  id: number;
  author: FeedAuthor;
  body: string | null;
  imageUrl: string | null;
  videoUid: string | null;
  videoThumb: string | null;
  book: FeedBook | null;
  reshareOf: FeedPost | null;
  likeCount: number;
  commentCount: number;
  reshareCount: number;
  likedByMe: boolean;
  mine: boolean;
  createdAt: string;
};

const rowSelect = {
  p: schema.posts,
  authorName: schema.users.displayName,
  authorHandle: schema.users.handle,
  authorLeague: schema.users.leagueId,
  bookTitle: schema.books.title,
  bookAuthor: schema.books.author,
};

type RawRow = {
  p: typeof schema.posts.$inferSelect;
  authorName: string | null;
  authorHandle: string | null;
  authorLeague: string | null;
  bookTitle: string | null;
  bookAuthor: string | null;
};

function baseQuery() {
  return db
    .select(rowSelect)
    .from(schema.posts)
    .leftJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
    .leftJoin(schema.books, eq(schema.books.id, schema.posts.bookId));
}

function toPost(r: RawRow, likedSet: Set<number>, myId: number, reshareOf: FeedPost | null = null): FeedPost {
  return {
    id: r.p.id,
    author: {
      id: r.p.authorId,
      name: r.authorName ?? "A reader",
      handle: r.authorHandle ?? "reader",
      leagueId: r.authorLeague,
    },
    body: r.p.body,
    imageUrl: r.p.imageUrl,
    videoUid: r.p.videoUid,
    videoThumb: r.p.videoThumb,
    book: r.bookTitle ? { id: r.p.bookId!, title: r.bookTitle, author: r.bookAuthor ?? "" } : null,
    reshareOf,
    likeCount: r.p.likeCount,
    commentCount: r.p.commentCount,
    reshareCount: r.p.reshareCount,
    likedByMe: likedSet.has(r.p.id),
    mine: r.p.authorId === myId,
    createdAt: r.p.createdAt.toISOString(),
  };
}

const PAGE = 20;

/** Global, newest-first feed. Pass the oldest id you have to page further. */
export async function listFeedAction(beforeId?: number): Promise<FeedPost[]> {
  const user = await requireUser();
  const where = beforeId
    ? and(eq(schema.posts.hidden, false), lt(schema.posts.id, beforeId))
    : eq(schema.posts.hidden, false);

  const rows = (await baseQuery().where(where).orderBy(desc(schema.posts.id)).limit(PAGE)) as RawRow[];
  if (rows.length === 0) return [];

  // Load the originals for any reshares (one level deep).
  const reshareIds = [...new Set(rows.map((r) => r.p.resharedFromId).filter((x): x is number => !!x))];
  const originals = reshareIds.length
    ? ((await baseQuery().where(inArray(schema.posts.id, reshareIds))) as RawRow[])
    : [];

  // Which of all these posts has the current user liked?
  const allIds = [...new Set([...rows.map((r) => r.p.id), ...originals.map((r) => r.p.id)])];
  const likedRows = allIds.length
    ? await db
        .select({ postId: schema.postLikes.postId })
        .from(schema.postLikes)
        .where(and(eq(schema.postLikes.userId, user.id), inArray(schema.postLikes.postId, allIds)))
    : [];
  const likedSet = new Set(likedRows.map((l) => l.postId));

  const originalsMap = new Map<number, FeedPost>();
  for (const o of originals) originalsMap.set(o.p.id, toPost(o, likedSet, user.id));

  return rows.map((r) =>
    toPost(r, likedSet, user.id, r.p.resharedFromId ? originalsMap.get(r.p.resharedFromId) ?? null : null)
  );
}

const createSchema = z
  .object({
    body: z.string().trim().max(2000).optional(),
    imageUrl: z.string().url().max(1000).optional(),
    bookId: z.coerce.number().int().positive().optional(),
    resharedFromId: z.coerce.number().int().positive().optional(),
    videoUid: z.string().max(200).optional(),
    videoThumb: z.string().url().max(1000).optional(),
  })
  .refine((d) => d.body || d.imageUrl || d.videoUid || d.resharedFromId, {
    message: "Write something or add an image.",
  });
export type CreatePostInput = z.input<typeof createSchema>;

export async function createPostAction(input: CreatePostInput): Promise<{ ok: boolean; id?: number; error?: string }> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid post" };
  const d = parsed.data;

  const [row] = await db
    .insert(schema.posts)
    .values({
      authorId: user.id,
      body: d.body || null,
      imageUrl: d.imageUrl || null,
      videoUid: d.videoUid || null,
      videoThumb: d.videoThumb || null,
      bookId: d.bookId ?? null,
      resharedFromId: d.resharedFromId ?? null,
    })
    .returning({ id: schema.posts.id });

  if (d.resharedFromId) {
    await db
      .update(schema.posts)
      .set({ reshareCount: sql`${schema.posts.reshareCount} + 1` })
      .where(eq(schema.posts.id, d.resharedFromId));
  }

  revalidatePath("/app/feed");
  return { ok: true, id: row.id };
}

export async function toggleLikeAction(postId: number): Promise<{ ok: boolean; liked: boolean; count: number }> {
  const user = await requireUser();
  const [existing] = await db
    .select({ id: schema.postLikes.id })
    .from(schema.postLikes)
    .where(and(eq(schema.postLikes.postId, postId), eq(schema.postLikes.userId, user.id)))
    .limit(1);

  if (existing) {
    await db.delete(schema.postLikes).where(eq(schema.postLikes.id, existing.id));
    await db.update(schema.posts).set({ likeCount: sql`GREATEST(${schema.posts.likeCount} - 1, 0)` }).where(eq(schema.posts.id, postId));
  } else {
    await db.insert(schema.postLikes).values({ postId, userId: user.id }).onConflictDoNothing();
    await db.update(schema.posts).set({ likeCount: sql`${schema.posts.likeCount} + 1` }).where(eq(schema.posts.id, postId));
  }
  const [p] = await db.select({ c: schema.posts.likeCount }).from(schema.posts).where(eq(schema.posts.id, postId)).limit(1);
  return { ok: true, liked: !existing, count: p?.c ?? 0 };
}

export type CommentDTO = { id: number; authorName: string; authorHandle: string; body: string; createdAt: string; mine: boolean };

export async function addCommentAction(postId: number, body: string): Promise<{ ok: boolean; comment?: CommentDTO; error?: string }> {
  const user = await requireUser();
  const text = (body ?? "").trim();
  if (!text) return { ok: false, error: "Write a comment." };
  if (text.length > 1000) return { ok: false, error: "Comment too long." };

  const [row] = await db
    .insert(schema.postComments)
    .values({ postId, userId: user.id, body: text })
    .returning({ id: schema.postComments.id, createdAt: schema.postComments.createdAt });
  await db.update(schema.posts).set({ commentCount: sql`${schema.posts.commentCount} + 1` }).where(eq(schema.posts.id, postId));

  return {
    ok: true,
    comment: { id: row.id, authorName: user.displayName, authorHandle: user.handle, body: text, createdAt: row.createdAt.toISOString(), mine: true },
  };
}

export async function listCommentsAction(postId: number): Promise<CommentDTO[]> {
  const user = await requireUser();
  const rows = await db
    .select({ c: schema.postComments, name: schema.users.displayName, handle: schema.users.handle })
    .from(schema.postComments)
    .leftJoin(schema.users, eq(schema.users.id, schema.postComments.userId))
    .where(eq(schema.postComments.postId, postId))
    .orderBy(schema.postComments.createdAt);
  return rows.map(({ c, name, handle }) => ({
    id: c.id,
    authorName: name ?? "A reader",
    authorHandle: handle ?? "reader",
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    mine: c.userId === user.id,
  }));
}

export async function reportPostAction(postId: number): Promise<{ ok: boolean }> {
  await requireUser();
  // Three reports auto-hides a post pending coordinator review.
  await db
    .update(schema.posts)
    .set({
      reportCount: sql`${schema.posts.reportCount} + 1`,
      hidden: sql`(${schema.posts.reportCount} + 1) >= 3`,
    })
    .where(eq(schema.posts.id, postId));
  revalidatePath("/app/feed");
  return { ok: true };
}

export async function deletePostAction(postId: number): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const cond =
    user.role === "coordinator"
      ? eq(schema.posts.id, postId)
      : and(eq(schema.posts.id, postId), eq(schema.posts.authorId, user.id));
  await db.delete(schema.posts).where(cond);
  revalidatePath("/app/feed");
  return { ok: true };
}
