# ReadLeague — Where we left off

> **Living status doc.** Updated at the end of each work session. When you come back
> after a reboot, open Claude Code in this folder and say *"read STATUS.md, where did
> we leave off?"* — that's all you need.

_Last updated: 2026-06-04_

## 🆕 Latest (2026-06-04, pt 2) — ready for friends to test
- **📈 Books now load in ~1–2s** (were 13–28s). Cause: every open did a live round-trip
  to Project Gutenberg. Fix: bundled **50 curated public-domain EPUBs as static files in
  `public/books/`** (served from Vercel's CDN); reader loads same-origin static files
  directly (`scripts/bundle-books.ts`, `npm run bundle-books -- N`). Library trimmed to
  those 50 fast books + 3 reward books. (Vercel **Blob isn't provisioned** — token empty in
  both `.env.local` and Vercel — so static hosting was the no-setup path. To scale to
  hundreds, provision a Blob store and we can host more.)
- **Upload form console error fixed** (removed `encType`; React 19 sets it automatically).
- **Sign-up is readers-only** (server-enforced in `auth.ts`, not just UI) so the public link
  can't let strangers self-register as admins. The demo **coord** login still works for you;
  secure it any time with `npm run set-password -- coord@readleague.app "NewPass"`.
- Live + verified fast on production: **https://readleague-app.vercel.app**

## 🆕 Latest session (2026-06-04)
- **📚 Reading FIXED + library reseeded.** The old seeded book URLs (Standard Ebooks)
  returned HTML, not EPUBs → every book showed "Error loading book". Fixes:
  - New **`/api/book-file/[id]`** proxy streams the file through our origin (fixes CORS,
    forces correct content-type, enforces access). Reader loads via it. Verified: books
    render on local AND production (screenshot).
  - **Library now has ~300 real Project Gutenberg books** (`npm run db:books`). To load
    more/fewer: `npm run db:books -- 800`. Curated classics insert first (always), then
    bulk popular titles via Gutendex. Keeps users/leagues; rewards preserved.
  - Note: first open of a book can take ~10–25s (we download it from Gutenberg, then it's
    edge-cached). You do NOT need to upload a book yourself — the library is pre-filled.
- **Login: show/hide password toggle** added (helps avoid autofill/typo confusion).
- **Back buttons** added to book-detail and upload pages (`src/components/BackButton.tsx`).
  Reader already had "← Close".
- **Password rules** strengthened: 8+ chars, a letter, and a number — enforced in
  `src/app/actions/auth.ts` and shown as a live ✓ checklist on signup.
- **Google sign-in built** (`src/lib/google.ts`, `src/app/api/auth/google/*`). Hand-rolled
  OAuth that reuses the existing cookie session — **no DB migration** (new Google users get a
  random password hash; existing emails are linked). The "Continue with Google" button is
  **gated**: it only appears once `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` are set.
  - 👉 **ACTION FOR YOU:** follow **`SETUP-GOOGLE.md`** (≈5 min) to create the Google
    credential and paste it into `.env.local`, then restart `npm run dev`. That's the only
    thing standing between you and a working Google login.
- Verified: `npx tsc --noEmit` clean + `npm run build` passes (21 routes).
- The MetaMask error you saw is a **browser wallet extension**, not our app — ignore it
  (or use an Incognito window).

## What this is
ReadLeague — a gamified reading club. Readers read books, earn points, climb
African-kingdom-themed leagues (Asante → Yoruba → Zulu → Maasai → Tuareg). A
coordinator approves uploads, manages the ladder, and closes weekly cycles which
promote/relegate readers and unlock reward books.

## Stack
- **Next.js 16** (App Router) + **React 19**
- **Drizzle ORM** + **Neon Postgres** (serverless)
- **Vercel Blob** for book files (PDF/EPUB)
- **bcryptjs** auth + cookie session (`src/lib/session.ts`, `src/proxy.ts`)
- **react-pdf / react-reader** in-app readers
- Tailwind 4

## Current state — essentially DONE and LIVE ✅
- **Deployed & healthy:** https://readleague-app.vercel.app (returns 200; auth guard works)
- Full feature set is built:
  - Auth: signup/login, session cookie, route guard (`/app` → `/login` when logged out)
  - Reader app: discover, library, leagues + position chart, profile, upload, in-app
    EPUB/PDF reader with auto progress tracking
  - Admin: approvals queue, books (+ new book / locks / grant-unlock), ladder, users,
    cycle close, announcements
  - Domain logic: points, leagues, unlock rules, weekly cycle promote/relegate
- DB schema complete (`src/db/schema.ts`): leagues, users, books, bookUnlocks,
  readingSessions, userProgress, badges, userBadges, leagueCycles, announcements

## Demo logins (all password: `readmore123`)
- **Coordinator:** coord@readleague.app
- **Readers:** kojo@, king@, ama@, adwoa@, esi@, kofi@, yaw@ — all @readleague.app

## Run locally
```powershell
npm run dev                       # http://localhost:3000  (uses .env.local)
node scripts/smoke-login.mjs      # quick headless login check (coord → /admin)
npm run db:seed                   # reseed demo data (coord + readers, leagues, books)
npm run e2e                       # full Playwright walkthrough (see WARNING below)
```

## Troubleshooting
- **"SESSION_SECRET is not set" on login** — `.env.local` had an empty `SESSION_SECRET`
  (fixed 2026-06-04 with a random 96-char value; login verified locally AND on prod).
  If you ever recreate `.env.local` / re-run `vercel env pull`, set `SESSION_SECRET=`
  to any long random string and restart `npm run dev`. (Prod's secret lives in the
  Vercel dashboard and is already set.)

## Open items / next steps
1. **Re-run e2e** — the last run (2026-06-03 08:24) failed only at step 1, a transient
   30s landing-page timeout (an older script version waited for `networkidle`, which
   hangs on Next streaming). The site is up now, so a re-run should pass.
   - ⚠️ **WARNING:** `npm run e2e` mutates the **production** DB — it creates books and
     **closes the weekly cycle** (irreversible). Run against a local/preview DB, or
     accept the prod side effects, before running.
2. ~~Commit the work~~ — ✅ DONE (commits on `master`). No git remote pushed yet — local only.
3. **Finish Google sign-in** — do the 5-minute `SETUP-GOOGLE.md` steps (create credential,
   paste into `.env.local`, restart). For the LIVE site, also add the two env vars in the
   Vercel dashboard and redeploy.
4. (Optional polish) badges UI, profile charts review, empty-state copy.

## Related artifacts (older, superseded by this app)
- `C:\Users\gaisi\ReadLeague.html` — original design prototype (static, design-canvas)
- `C:\Users\gaisi\ReadLeague-project\` — multi-file source for that prototype
- `C:\Users\gaisi\readleague\` — earlier React client+server attempt (abandoned)
