"use server";

import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { hasPurchased } from "@/lib/unlock";
import { PAYSTACK_ENABLED, paystackInitialize } from "@/lib/paystack";

/** Begins a Paystack checkout for a paid book; returns the URL to redirect to.
 *  If the user already owns it, returns the read URL instead. */
export async function startBookPurchaseAction(bookId: number): Promise<{ ok: boolean; url?: string; error?: string }> {
  const user = await requireUser();
  if (!PAYSTACK_ENABLED) return { ok: false, error: "Payments aren’t turned on yet." };

  const [book] = await db.select().from(schema.books).where(eq(schema.books.id, bookId)).limit(1);
  if (!book) return { ok: false, error: "Book not found." };
  const price = book.priceGhs ?? 0;
  if (price <= 0) return { ok: false, error: "This book is free to read." };
  if (await hasPurchased(user.id, book.id)) return { ok: true, url: `/app/read/${book.id}` };

  const reference = `rl_${book.id}_${user.id}_${Date.now()}`;
  await db.insert(schema.purchases).values({ userId: user.id, bookId: book.id, amountGhs: price, reference, status: "pending" });

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const callbackUrl = `${proto}://${host}/api/paystack/callback`;

  try {
    const { authorizationUrl } = await paystackInitialize({
      email: user.email,
      amountGhs: price,
      reference,
      callbackUrl,
      metadata: { userId: user.id, bookId: book.id, title: book.title },
    });
    return { ok: true, url: authorizationUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start the payment." };
  }
}
