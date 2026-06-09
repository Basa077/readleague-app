import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { paystackVerify } from "@/lib/paystack";

// Paystack redirects the buyer here after checkout. We verify the transaction
// server-to-server and, on success, mark the purchase paid (which grants read
// access) before sending them into the book. The webhook is the backup path.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const reference = url.searchParams.get("reference") || url.searchParams.get("trxref");
  if (!reference) return NextResponse.redirect(new URL("/app", req.url));

  const [purchase] = await db.select().from(schema.purchases).where(eq(schema.purchases.reference, reference)).limit(1);
  if (!purchase) return NextResponse.redirect(new URL("/app", req.url));

  try {
    const data = await paystackVerify(reference);
    if (data.status === "success") {
      await db.update(schema.purchases).set({ status: "success", updatedAt: new Date() }).where(eq(schema.purchases.id, purchase.id));
      return NextResponse.redirect(new URL(`/app/read/${purchase.bookId}?purchased=1`, req.url));
    }
    await db.update(schema.purchases).set({ status: "failed", updatedAt: new Date() }).where(eq(schema.purchases.id, purchase.id));
  } catch {
    /* fall through to the failed redirect */
  }
  return NextResponse.redirect(new URL(`/app/books/${purchase.bookId}?payment=failed`, req.url));
}
