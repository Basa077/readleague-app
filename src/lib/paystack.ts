import "server-only";
import crypto from "node:crypto";

// Paystack handles MoMo + cards for Ghana and cards globally. Gated on the
// secret key so the rest of the app works before payments are configured.
const SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
export const PAYSTACK_ENABLED = SECRET.length > 0;
export const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY ?? "";

const API = "https://api.paystack.co";

type InitInput = {
  email: string;
  amountGhs: number; // whole cedis
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

/** Create a transaction; returns the hosted checkout URL to redirect the user to. */
export async function paystackInitialize(input: InitInput): Promise<{ authorizationUrl: string; reference: string }> {
  const res = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: input.email,
      amount: Math.round(input.amountGhs * 100), // Paystack expects the minor unit (pesewas)
      currency: "GHS",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as { status: boolean; message: string; data?: { authorization_url: string; reference: string } };
  if (!json.status || !json.data) throw new Error(json.message || "Paystack could not start the transaction.");
  return { authorizationUrl: json.data.authorization_url, reference: json.data.reference };
}

/** Confirm a transaction's final state with Paystack. */
export async function paystackVerify(reference: string): Promise<{ status: string; amount: number; reference: string }> {
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${SECRET}` },
    cache: "no-store",
  });
  const json = (await res.json()) as { status: boolean; message: string; data?: { status: string; amount: number; reference: string } };
  if (!json.status || !json.data) throw new Error(json.message || "Could not verify the transaction.");
  return json.data;
}

/** Validate a Paystack webhook signature (HMAC-SHA512 of the raw body). */
export function paystackValidSignature(rawBody: string, signature: string | null): boolean {
  if (!signature || !SECRET) return false;
  const hash = crypto.createHmac("sha512", SECRET).update(rawBody).digest("hex");
  return hash === signature;
}
