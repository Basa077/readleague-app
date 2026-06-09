import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { paystackValidSignature } from "@/lib/paystack";

// Reliable settlement path: Paystack POSTs charge events here. We verify the
// HMAC signature, then mark the matching purchase paid. Idempotent.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!paystackValidSignature(raw, req.headers.get("x-paystack-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }
  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("bad json", { status: 400 });
  }
  if (event.event === "charge.success" && event.data?.reference) {
    await db
      .update(schema.purchases)
      .set({ status: "success", updatedAt: new Date() })
      .where(eq(schema.purchases.reference, event.data.reference));
  }
  return new Response("ok");
}
