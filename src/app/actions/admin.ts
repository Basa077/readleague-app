"use server";

import { db, schema } from "@/db";
import { and, eq, desc, sql, asc } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireCoordinator } from "@/lib/auth";
import { LEAGUE_LADDER, generateNextLeague } from "@/lib/leagues";
import { UPLOAD_APPROVAL_BONUS } from "@/lib/points";

export type ActionState = { error?: string; ok?: boolean; message?: string };

export async function approveBookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoordinator();
  const id = Number(formData.get("bookId"));
  if (!id) return { error: "Missing book id" };

  const [book] = await db.select().from(schema.books).where(eq(schema.books.id, id)).limit(1);
  if (!book) return { error: "Book not found" };

  await db.update(schema.books).set({ status: "approved" }).where(eq(schema.books.id, id));

  // Uploader bonus
  if (book.uploaderId) {
    await db
      .update(schema.users)
      .set({
        weeklyPts: sql`${schema.users.weeklyPts} + ${UPLOAD_APPROVAL_BONUS}`,
        totalPts: sql`${schema.users.totalPts} + ${UPLOAD_APPROVAL_BONUS}`,
        booksUploaded: sql`${schema.users.booksUploaded} + 1`,
        cycleUploads: sql`${schema.users.cycleUploads} + 1`,
      })
      .where(eq(schema.users.id, book.uploaderId));

    // Check ticket threshold for the uploader's current league
    const [uploader] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, book.uploaderId))
      .limit(1);
    if (uploader?.leagueId) {
      const [league] = await db
        .select()
        .from(schema.leagues)
        .where(eq(schema.leagues.id, uploader.leagueId))
        .limit(1);
      if (league && uploader.cycleUploads >= league.uploadsRequired) {
        // Award one ticket and reset their cycle-upload counter so they need to do it again
        await db
          .update(schema.users)
          .set({
            tickets: sql`${schema.users.tickets} + 1`,
            cycleUploads: 0,
          })
          .where(eq(schema.users.id, uploader.id));
      }
    }
  }

  revalidatePath("/admin/approvals");
  revalidatePath("/admin/books");
  revalidatePath("/app");
  return { ok: true };
}

export async function rejectBookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoordinator();
  const id = Number(formData.get("bookId"));
  if (!id) return { error: "Missing book id" };
  await db.update(schema.books).set({ status: "rejected" }).where(eq(schema.books.id, id));
  revalidatePath("/admin/approvals");
  return { ok: true };
}

const grantSchema = z.object({
  bookId: z.coerce.number().int().positive(),
  userId: z.coerce.number().int().positive(),
  reason: z.string().max(140).default("Granted by coordinator"),
});

export async function grantUnlockAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireCoordinator();
  const parsed = grantSchema.safeParse({
    bookId: formData.get("bookId"),
    userId: formData.get("userId"),
    reason: formData.get("reason") || "Granted by coordinator",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await db
    .insert(schema.bookUnlocks)
    .values({
      bookId: parsed.data.bookId,
      userId: parsed.data.userId,
      reason: parsed.data.reason,
    })
    .onConflictDoNothing();

  revalidatePath("/admin/books");
  revalidatePath("/app");
  return { ok: true };
}

/**
 * Close a cycle for every league:
 *  - Top finisher promotes one tier up (auto-create next league if needed)
 *  - Bottom 3 relegate
 *  - Anyone holding a ticket gets bumped up too, ticket consumed
 *  - Reward books auto-unlock to qualifying finishers
 *  - Reset weekly_pts and cycle_uploads
 */
export async function closeCycleAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  await requireCoordinator();
  const now = new Date();
  const movements = { promoted: 0, relegated: 0, ticketsCashed: 0, unlocksGranted: 0, newLeagues: 0 };

  // Get current leagues sorted by tier ascending (top first)
  let leagues = await db.select().from(schema.leagues).orderBy(asc(schema.leagues.tier));
  const tierMap = (id: string) => leagues.find((l) => l.id === id)!.tier;

  // Ensure top league has a league above it (auto-create one if anyone in the top league has points)
  const topLeague = leagues[0];
  if (topLeague) {
    const [topMember] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.leagueId, topLeague.id))
      .orderBy(desc(schema.users.weeklyPts))
      .limit(1);
    if (topMember && topMember.weeklyPts > 0) {
      // Need a tier above topLeague.tier (which is 1 or lower)
      const nextDef = LEAGUE_LADDER.find((d) => !leagues.some((l) => l.id === d.id) && d.threshold > topLeague.threshold);
      if (nextDef) {
        await db.insert(schema.leagues).values({
          id: nextDef.id,
          name: nextDef.name,
          championTitle: nextDef.championTitle,
          threshold: nextDef.threshold,
          uploadsRequired: nextDef.uploadsRequired,
          tier: topLeague.tier - 1,
        }).onConflictDoNothing();
        movements.newLeagues++;
      } else {
        const generated = generateNextLeague(topLeague.tier - 1);
        await db.insert(schema.leagues).values({
          ...generated,
          tier: topLeague.tier - 1,
        }).onConflictDoNothing();
        movements.newLeagues++;
      }
      leagues = await db.select().from(schema.leagues).orderBy(asc(schema.leagues.tier));
    }
  }

  function leagueAtTier(t: number) {
    return leagues.find((l) => l.tier === t);
  }

  for (const league of leagues) {
    const members = await db
      .select({ userId: schema.users.id, pts: schema.users.weeklyPts, tickets: schema.users.tickets })
      .from(schema.users)
      .where(eq(schema.users.leagueId, league.id))
      .orderBy(desc(schema.users.weeklyPts), asc(schema.users.id));

    const standings = members.map((m, i) => ({ ...m, rank: i + 1 }));

    // Locked reward books targeting outcomes in this league
    const lockedBooks = await db
      .select()
      .from(schema.books)
      .where(eq(schema.books.lockLeagueId, league.id));

    for (const book of lockedBooks) {
      if (book.lockType === "league_winner") {
        const winner = standings.find((s) => s.rank === 1);
        if (winner) {
          const r = await db
            .insert(schema.bookUnlocks)
            .values({
              userId: winner.userId,
              bookId: book.id,
              reason: `Champion of ${league.name}`,
            })
            .onConflictDoNothing()
            .returning({ id: schema.bookUnlocks.id });
          if (r.length) movements.unlocksGranted++;
        }
      } else if (book.lockType === "league_top_n") {
        const n = book.lockPosition ?? 4;
        for (const s of standings.filter((s) => s.rank <= n)) {
          const r = await db
            .insert(schema.bookUnlocks)
            .values({
              userId: s.userId,
              bookId: book.id,
              reason: `Top ${n} of ${league.name}`,
            })
            .onConflictDoNothing()
            .returning({ id: schema.bookUnlocks.id });
          if (r.length) movements.unlocksGranted++;
        }
      }
    }

    // Promote top 1 (rank=1, pts>0)
    const aboveLeague = leagueAtTier(league.tier - 1);
    if (aboveLeague) {
      const top = standings[0];
      if (top && top.pts > 0) {
        await db.update(schema.users).set({ leagueId: aboveLeague.id }).where(eq(schema.users.id, top.userId));
        movements.promoted++;
      }
    }

    // Promote ticket holders (excluding the top, who already promoted)
    if (aboveLeague) {
      for (const s of standings.slice(1)) {
        if (s.tickets > 0) {
          await db
            .update(schema.users)
            .set({
              leagueId: aboveLeague.id,
              tickets: sql`${schema.users.tickets} - 1`,
            })
            .where(eq(schema.users.id, s.userId));
          movements.promoted++;
          movements.ticketsCashed++;
        }
      }
    }

    // Relegate bottom 3 (only if league has >=4 members and a league below exists)
    const belowLeague = leagueAtTier(league.tier + 1);
    if (belowLeague && standings.length >= 4) {
      const bottom = standings.slice(-3);
      for (const b of bottom) {
        await db.update(schema.users).set({ leagueId: belowLeague.id }).where(eq(schema.users.id, b.userId));
        movements.relegated++;
      }
    }
  }

  // Reset weekly counters
  await db.update(schema.users).set({ weeklyPts: 0, cycleUploads: 0 });

  // Record cycle close for every league
  for (const league of leagues) {
    await db.insert(schema.leagueCycles).values({
      leagueId: league.id,
      weekStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      weekEnd: now,
      status: "closed",
      closedAt: now,
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/ladder");
  revalidatePath("/app/leagues");
  revalidatePath("/app");

  return {
    ok: true,
    message: `Cycle closed — ${movements.promoted} promoted (${movements.ticketsCashed} via tickets), ${movements.relegated} relegated, ${movements.unlocksGranted} reward unlocks, ${movements.newLeagues} new league created`,
  };
}

const announceSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  scope: z.string().default("all"),
});

export async function announceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireCoordinator();
  const parsed = announceSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    scope: formData.get("scope") || "all",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await db.insert(schema.announcements).values({
    title: parsed.data.title,
    body: parsed.data.body,
    scope: parsed.data.scope,
    authorId: user.id,
  });
  revalidatePath("/admin/announcements");
  revalidatePath("/app");
  return { ok: true, message: "Announcement posted" };
}
