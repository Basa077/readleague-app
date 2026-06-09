# ReadLeague — Where we left off

> **Living status doc.** Updated at the end of each work session. When you come back
> after a reboot, open Claude Code in this folder and say *"read STATUS.md, where did
> we leave off?"* — that's all you need.

_Last updated: 2026-06-09_

## 🆕 Latest (2026-06-09, pt 2) — paid books via Paystack (MoMo + cards)
Typechecks + `npm run build` green (paystack routes present). Schema pushed
(`books.price_ghs` + `purchases`). **Verified: Paystack test key returns a real
checkout URL; in-app Buy → checkout.paystack.com; reading blocked before
purchase, allowed after** (gating unit-checked + browser-checked). Test book
reset to free; committed. **Test keys** only so far — see `SETUP-PAYSTACK.md`.

- **💳 Sell any book.** Coordinator sets a price at **Admin → Books → a book →
  "Price & selling"** (`PriceEditor`). Price > 0 makes it premium (overrides
  league locks). Readers see **"Buy to read · GHS X"** → Paystack hosted checkout
  (**MoMo + card**) → callback verifies → access granted. Uploader + coordinators
  read their paid books free.
- **Flow:** `lib/paystack.ts` (initialize/verify/webhook-signature),
  `actions/purchases.ts` (start checkout), `/api/paystack/callback` (verify on
  redirect), `/api/paystack/webhook` (signed backup), access in `lib/unlock.ts`
  (`hasPurchased`). `purchases` table records each attempt.
- **Aim (per the user):** MoMo for Ghana, cards for everyone — Paystack covers
  both. Multi-provider (Flutterwave) can be added later behind the same UI.
- **Go-live = config, not code:** add the 2 keys to Vercel + a webhook URL, then
  swap test→live keys after Paystack business verification (the GhanaPost GPS
  step). All in `SETUP-PAYSTACK.md`.

## 🆕 Latest (2026-06-09) — feed → immersive: video, Stories, swipe & #hashtags
Typechecks + `npm run build` green. Schema pushed (video/story columns +
`post_hashtags`). **Verified live (headless): post w/ #hashtag → trending bar
surfaces it → tag page lists it → swipe view opens — 6/6, 0 *app* errors.**
(One hydration warning seen in headless Edge = a browser-injected `caret-color`
on inputs, not our code — same benign class as the MetaMask note.) Committed; not
deployed. **Video/story media upload needs the prod Blob token, so it's a
prod-only path — verify media after deploy** (text/hashtag/swipe verified local).

- **🎥 Video — on Vercel Blob (no Cloudflare needed).** Decided to ship video on
  the Blob store we already have (Cloudflare Stream deferred as a scale upgrade).
  Posts + stories take short clips; `upload-media` route + `media-client` now
  accept video (≤60MB). Plays via HTML5 `<video>`.
- **📸 Stories (24h).** `isStory`/`expiresAt` on posts. Tray at the top of the
  feed (rings + "Your story"), a composer that uses the **camera on mobile**
  (`capture`), and a full-screen tap-through **viewer** with progress bars
  (`Stories.tsx`).
- **⤢ Swipe feed.** Full-screen vertical scroll-snap pager (TikTok/Reels feel),
  autoplays video while in view, right-rail like/comment/reshare, comments
  bottom-sheet (`SwipeFeed.tsx`). Opens from a button on the feed.
- **#️⃣ Hashtags + trending.** `#tags` parsed from posts → `post_hashtags`;
  clickable in posts (`RichText.tsx`), a **Trending** bar (hot tags + "books
  people are reading") + hashtag **search** (`Trending.tsx`), and `#tag` pages
  at `/app/feed/tag/[tag]`. This is the "search #trending → everyone hops on a
  book" discovery loop.

### Decisions locked this session
- **Video host = Vercel Blob now**, Cloudflare later only if needed (so there's
  nothing for the user to set up for video).
- **Payments = multi-provider, gated** (build when ready): **MoMo for Ghana**
  via Paystack/Flutterwave, **cards globally**. Still needs (a) a merchant
  account's API keys and (b) what books are actually for sale (licensing).

## 🆕 Latest (2026-06-08, pt 2) — the worldwide Feed (Phase 2 begins)
Typechecks + `npm run build` green. New feed tables pushed to Neon. **Verified
live in a headless browser: post → like → comment → reshare all work, 0 runtime
errors** (test rows cleaned up). Committed; not deployed.

- **🌍 `/app/feed` — a global social feed.** Readers post what they read &
  learnt; everyone sees the newest-first worldwide stream. **Text + image** now
  (image via the same direct-to-Blob path as books — works on prod; local needs
  the Blob token). **Like, comment, reshare** (a reshare quotes the original
  inline), tag a book you read, paginated "Load more". Added **Feed** to the
  side + bottom nav.
- **🛡️ Light moderation built in:** any reader can **Report** a post; 3 reports
  auto-hides it; authors can delete their own, coordinators can delete any.
- **🎥 Video = next step (Cloudflare Stream).** Schema fields (`videoUid`,
  `videoThumb`) are in place and the composer shows a gated "Video (setup)"
  button. To turn it on, follow **`SETUP-CLOUDFLARE.md`** (create a Stream
  account + API token, set `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_STREAM_TOKEN`),
  then the direct-upload route + player embed get wired.
- Files: `src/db/schema.ts` (posts/postLikes/postComments), `actions/feed.ts`,
  `app/app/feed/{page,FeedClient,PostCard}.tsx`, `api/blob/upload-media`,
  `lib/media-client.ts`, nav components, `lib/config.ts`.

### Phase-2 still open
- **Wire Cloudflare video** once creds exist (see SETUP-CLOUDFLARE.md).
- **Paid/commercial books** (task #5) — still blocked on *business* calls:
  content licensing (our catalogue is public-domain on purpose) + a payment
  provider (Paystack/Flutterwave/MoMo suggested for Ghana). Code plumbing is
  ready to build once those are decided.
- A coordinator **review queue** for reported posts (currently report→auto-hide
  + manual delete only).

## 🆕 Latest (2026-06-08) — reader gets notes, highlights & a true page view
Typechecks + `npm run build` green (23 routes). DB migrated (`npm run db:push` applied —
new `annotations` table is live on the shared Neon DB). **Not yet committed or deployed; not
yet click-tested in a browser** — boot `npm run dev` and open any book to try it.

- **📖 PDF "extended" continuous-scroll view.** The PDF reader used to show one page at a
  time; now it defaults to a **continuous vertical scroll** (every page stacked, lazy-rendered
  so big PDFs stay fast, current page auto-tracked for points). Toggle "▤ One page" for the
  old single-page mode; "▦ Pages" still opens the thumbnail grid. (`PdfReader.tsx`.)
- **🖍️ Private highlights + notes (PDF & EPUB).** Pick a pen colour, drag across text → a
  highlight is saved. Each colour has a **built-in meaning**: 🟡 Important · 🟢 Loved this ·
  🔵 Learn this · 🩷 I disagree · 🟣 Question (legend in `src/lib/annotations.ts`). Tap a
  highlight (or the ✎ panel) to attach a **note** ("what I liked / want others to learn").
  **Private by default**; each note has a **"Share with readers of this book"** toggle that
  surfaces it to others on that book. "＋ Note" adds a page-level comment. New table
  `annotations` (`src/db/schema.ts`), server actions `src/app/actions/annotations.ts`, client
  hook `useAnnotations.ts`, UI in `AnnotationUI.tsx`. PDF anchors via normalized rects+page;
  EPUB via epubjs CFI ranges (native `rendition.annotations`).
- **™️ Citation-on-copy (anti-plagiarism).** Copying text from any book now appends an
  APA-flavoured citation (Author (Year). Title. Read on ReadLeague.) to the clipboard, so
  passages leave the app already attributed. `buildCitation` in `src/lib/annotations.ts`.

### Open items after this session
1. **Click-test in a browser** (highlight drag, note save, share toggle, copy→citation) then
   **commit + `vercel --prod`**. Nothing committed yet this session.
2. The EPUB "Pages" overview was renamed to **"Chapters"** (it lists TOC sections).
3. **Phase 2 / the bigger vision (discussed, not started):** a **worldwide social feed**
   (posts + video + like/comment/reshare — needs a video host like Mux/Cloudflare Stream +
   moderation; start text/image first) and **paid/commercial books** (blocked on content
   *licensing* — our catalogue is public-domain on purpose — plus a payment provider;
   Paystack/Flutterwave/MoMo for Ghana over Stripe). Tracked as tasks #4/#5.

## 🆕 Latest (2026-06-05) — brand, onboarding, auto-library & big uploads
A big feature session. All of the below typecheck clean and `npm run build` is green (32 routes).

- **🛡️ Logo + brand identity.** New `src/components/Logo.tsx` — a heraldic green shield
  cradling an open book (heraldry = the kingdom leagues; book = reading), plus a
  two-tone "Read**League**" wordmark. Wired into the sidebar, mobile top bar, landing,
  login & signup. Favicon added at `src/app/icon.svg` (served automatically).
- **🧭 First-run guided tour.** `src/components/Tour.tsx` — a custom, dependency-free
  spotlight tour that auto-runs once on a reader's first visit to `/app` (remembered in
  `localStorage` `rl-tour-v1`), is skippable, and replayable from Profile → "Replay the
  tour". Anchors via `data-tour` attrs on the search bar + nav (works on both the mobile
  bottom-nav and desktop sidebar). Verified with screenshots.
- **📚 Request-a-book (auto-find & add).** When a search returns nothing, readers can
  click **"Find & add"** and we fetch a real, free public-domain EPUB and add it to the
  library instantly. Engine: `src/lib/booksource.ts` — **two providers** for resilience
  (Gutendex/Project Gutenberg **and** Open Library → Internet Archive), every candidate
  **validated** (real EPUB magic bytes) before insert, run in parallel. Action:
  `src/app/actions/request-book.ts`; UI: `src/components/RequestBook.tsx`.
  ⚠️ NOTE: **Gutendex was timing out** during this session, so the Internet Archive
  provider is currently carrying the feature (verified live: Frankenstein, Pride &
  Prejudice, etc. resolve to validated EPUBs with covers + years). Books are added **open
  (readable now)**; `AUTO_LOCK_THRESHOLD = 20000` in `src/lib/config.ts` is the switch to
  start gating requested books behind league rules once the catalogue is large.
- **⬆️ Big uploads via direct-to-Blob (reader + admin).** The Blob store **is** provisioned
  on prod (confirmed `vercel env ls`: `BLOB_READ_WRITE_TOKEN` etc. exist for Prod+Preview —
  the old "not provisioned" note was stale). Uploads now go **straight from the browser to
  Vercel Blob** via `@vercel/blob/client` (`src/lib/blob-client.ts` + token route
  `src/app/api/blob/upload/route.ts`), bypassing Vercel's ~4.5MB Serverless Function body
  cap. Limit raised to **50MB**. Server actions (`actions/upload.ts`) now finalise from the
  blob URL (fetching head bytes for the auto-review). ⚠️ Local uploads still won't work
  (sensitive token is empty in `.env.local`) — this is a **prod-only** path; verify after deploy.
- **✨ Polish.** Real **badges** on Profile (derived from stats in `src/lib/badges.ts`, so
  they're always in sync — earned vs locked-with-hint), and a friendly **empty-state** for
  the profile charts when a user has no sessions yet.
- **🔐 Google sign-in:** code re-verified correct & ready — still just needs the credential
  (see `SETUP-GOOGLE.md`). Nothing to change in code.

### Shipped + verified on prod (2026-06-05)
- **Committed + pushed** to GitHub (master, commits `1787a36` + `5a1cbf8`) and **deployed**
  (`vercel --prod`, READY, aliased to readleague-app.vercel.app).
- **Verified live on prod:** logo + favicon, first-run tour auto-runs, login, **a real file
  upload** (browser→Blob → auto-approved ✓ — the path that can't be tested locally), and
  **request-a-book** (added "The Wonderful Wizard of Oz" from Internet Archive). The upload
  test book was cleaned out of the DB afterward.
- **request-a-book latency** optimised from ~25s → ~4–5s (parallel candidate validation).

### Open items after this session
1. **Google:** do the `SETUP-GOOGLE.md` steps when you want the button live (code is ready).
2. Tiny: the upload test left one orphaned 87KB blob in storage (can't delete without the
   prod token locally) — harmless.
3. **e2e** still mutates prod + closes the cycle — unchanged warning below.

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
