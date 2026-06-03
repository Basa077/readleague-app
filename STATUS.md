# ReadLeague — Where we left off

> **Living status doc.** Updated at the end of each work session. When you come back
> after a reboot, open Claude Code in this folder and say *"read STATUS.md, where did
> we leave off?"* — that's all you need.

_Last updated: 2026-06-03_

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
npm run dev          # http://localhost:3000  (uses .env.local — already configured)
npm run db:seed      # reseed demo data (coord + readers, leagues, books)
npm run e2e          # full Playwright walkthrough (see WARNING below)
```

## Open items / next steps
1. **Re-run e2e** — the last run (2026-06-03 08:24) failed only at step 1, a transient
   30s landing-page timeout (an older script version waited for `networkidle`, which
   hangs on Next streaming). The site is up now, so a re-run should pass.
   - ⚠️ **WARNING:** `npm run e2e` mutates the **production** DB — it creates books and
     **closes the weekly cycle** (irreversible). Run against a local/preview DB, or
     accept the prod side effects, before running.
2. **Commit the work** — everything except the Create-Next-App initial commit is still
   uncommitted on `master` (all of `src/app/(public|admin|app|actions)`, `src/db`,
   `src/lib`, `src/components`, `drizzle.config.ts`, `scripts/`). Nothing is checkpointed.
3. (Optional polish) badges UI, profile charts review, empty-state copy.

## Related artifacts (older, superseded by this app)
- `C:\Users\gaisi\ReadLeague.html` — original design prototype (static, design-canvas)
- `C:\Users\gaisi\ReadLeague-project\` — multi-file source for that prototype
- `C:\Users\gaisi\readleague\` — earlier React client+server attempt (abandoned)
