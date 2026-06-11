# AI reading companion ("Lia") — status & turn-on

ReadLeague has an in-reader AI companion called **Lia**. While reading any book a
reader can tap **✨ Ask AI**, select a passage, and ask Lia to explain it,
summarise the story so far, define a hard word, or quiz them — answers stream in
live and are grounded on the book they're reading.

The code is **complete and shipped**, but the feature is **gated on an API key**
(exactly like Google sign-in and Paystack). Until the key is set, the **✨ Ask
AI** button simply doesn't appear — nothing breaks. Add the key to switch it on.

## Done
- Persona + guardrails (`src/lib/ai.ts`): Lia is warm, concise, teaches rather
  than spoon-feeds, avoids spoilers, and stays on the book/reading.
- Streaming endpoint (`src/app/api/assistant/route.ts`) calls **Claude** via the
  official Anthropic SDK and streams the reply back token-by-token.
- In-reader UI (`AssistantPanel.tsx`): slide-in chat with quick actions
  (Explain this · Summarise so far · Define a word · Quiz me). Selecting text in
  the EPUB **or** PDF reader feeds that passage to Lia as context.
- Gated on `ANTHROPIC_API_KEY` so it only appears once configured.

## To turn it on — locally
1. Get a key from **console.anthropic.com → API Keys** (keys start with `sk-ant-`).
   Billing is pay-as-you-go; add a little credit on the Billing page.
2. Add it to `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Restart `npm run dev`. The **✨ Ask AI** button now shows inside any book.

## To turn it on — LIVE site
1. **Add the key to Vercel** (Project → Settings → Environment Variables, all
   environments): `ANTHROPIC_API_KEY`.
2. Redeploy (`vercel --prod`). That's it.

## Choosing the model (optional, controls cost)
Lia defaults to **Claude Opus 4.8** (`claude-opus-4-8`) — the most capable, but
the priciest per answer. For high-volume reader Q&A you can trade some quality
for much lower cost by setting `ASSISTANT_MODEL` in the same env file:

| Set `ASSISTANT_MODEL` to | Trade-off |
| --- | --- |
| `claude-opus-4-8` (default) | Best answers, highest cost |
| `claude-sonnet-4-6` | Strong, cheaper — a good middle ground |
| `claude-haiku-4-5` | Fastest + cheapest, great for define/explain |

> Note: without the key the feature is invisible and the rest of the app is
> unaffected — so it's safe to ship before you've decided on billing.
