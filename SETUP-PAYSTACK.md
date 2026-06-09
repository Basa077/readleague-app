# Payments (Paystack) — status & go-live

Paystack powers paid books — **Mobile Money for Ghana + cards globally**. Test
keys are wired and the full flow is verified (Buy → Paystack checkout → callback
verify → access granted). Here's what's done and what's left to take real money.

## Done
- `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` (test) in `.env.local`.
- Coordinator sets a price per book: **Admin → Books → (a book) → "Price & selling"**.
- Reader sees **"Buy to read · GHS X"** on a priced book → Paystack checkout
  (MoMo + card) → on success the book unlocks for them.
- Routes: `/api/paystack/callback` (verify on redirect) + `/api/paystack/webhook`
  (signed settlement backup). Access logic in `src/lib/unlock.ts`.

## To make payments work on the LIVE site
1. **Add the keys to Vercel** (Project → Settings → Environment Variables, all
   environments): `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`. Redeploy.
2. **Add the webhook** in the Paystack dashboard → Settings → API Keys & Webhooks
   → Webhook URL: `https://readleague-app.vercel.app/api/paystack/webhook`.

## To switch from TEST to REAL money (when you're ready)
- Finish Paystack **business verification** (this is where the GhanaPost GPS
  address is asked). Get your digital address from the free **GhanaPostGPS** app
  (allow location → "My Location" → a `GA-…` code).
- Swap the test keys for your **live** keys (`sk_live_…` / `pk_live_…`) in Vercel
  and redeploy. Nothing else changes in the code.

> Note: test keys move **no real money** — they're for trying the flow end to end.
