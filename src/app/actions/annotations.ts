"use server";

import { db, schema } from "@/db";
import { and, eq, or, asc } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const colorEnum = z.enum(["yellow", "green", "blue", "pink", "purple"]);

const createSchema = z.object({
  bookId: z.coerce.number().int().positive(),
  kind: z.enum(["highlight", "note"]).default("highlight"),
  color: colorEnum.default("yellow"),
  page: z.coerce.number().int().min(1).max(100000).optional(),
  cfiRange: z.string().max(2000).optional(),
  rects: z.string().max(20000).optional(),
  selectedText: z.string().max(8000).optional(),
  note: z.string().max(4000).optional(),
  shared: z.boolean().default(false),
});

export type CreateAnnotationInput = z.input<typeof createSchema>;

export type AnnotationDTO = {
  id: number;
  mine: boolean;
  authorName: string;
  kind: string;
  color: string;
  page: number | null;
  cfiRange: string | null;
  rects: string | null;
  selectedText: string | null;
  note: string | null;
  shared: boolean;
  createdAt: string;
};

/** The current user's own annotations for a book, plus anything other readers
 *  have explicitly shared on it. */
export async function listAnnotationsAction(bookId: number): Promise<AnnotationDTO[]> {
  const user = await requireUser();
  const rows = await db
    .select({ a: schema.annotations, name: schema.users.displayName })
    .from(schema.annotations)
    .leftJoin(schema.users, eq(schema.annotations.userId, schema.users.id))
    .where(
      and(
        eq(schema.annotations.bookId, bookId),
        or(eq(schema.annotations.userId, user.id), eq(schema.annotations.shared, true))
      )
    )
    .orderBy(asc(schema.annotations.page), asc(schema.annotations.createdAt));

  return rows.map(({ a, name }) => ({
    id: a.id,
    mine: a.userId === user.id,
    authorName: name ?? "A reader",
    kind: a.kind,
    color: a.color,
    page: a.page,
    cfiRange: a.cfiRange,
    rects: a.rects,
    selectedText: a.selectedText,
    note: a.note,
    shared: a.shared,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function createAnnotationAction(
  input: CreateAnnotationInput
): Promise<{ ok: boolean; id?: number; error?: string }> {
  const user = await requireUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  // Make sure the book exists (and implicitly that the user has it open).
  const [book] = await db.select({ id: schema.books.id }).from(schema.books).where(eq(schema.books.id, d.bookId)).limit(1);
  if (!book) return { ok: false, error: "Book not found" };

  const [row] = await db
    .insert(schema.annotations)
    .values({
      userId: user.id,
      bookId: d.bookId,
      kind: d.kind,
      color: d.color,
      page: d.page,
      cfiRange: d.cfiRange,
      rects: d.rects,
      selectedText: d.selectedText,
      note: d.note,
      shared: d.shared,
    })
    .returning({ id: schema.annotations.id });

  return { ok: true, id: row.id };
}

const patchSchema = z.object({
  note: z.string().max(4000).optional(),
  color: colorEnum.optional(),
  shared: z.boolean().optional(),
});
export type PatchAnnotationInput = z.input<typeof patchSchema>;

export async function updateAnnotationAction(
  id: number,
  patch: PatchAnnotationInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = patchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const set: Partial<typeof schema.annotations.$inferInsert> & { updatedAt: Date } = { updatedAt: new Date() };
  if (parsed.data.note !== undefined) set.note = parsed.data.note;
  if (parsed.data.color !== undefined) set.color = parsed.data.color;
  if (parsed.data.shared !== undefined) set.shared = parsed.data.shared;

  await db
    .update(schema.annotations)
    .set(set)
    .where(and(eq(schema.annotations.id, id), eq(schema.annotations.userId, user.id)));
  return { ok: true };
}

export async function deleteAnnotationAction(id: number): Promise<{ ok: boolean }> {
  const user = await requireUser();
  await db
    .delete(schema.annotations)
    .where(and(eq(schema.annotations.id, id), eq(schema.annotations.userId, user.id)));
  return { ok: true };
}
