// End-to-end walkthrough of the redesigned ReadLeague using Microsoft Edge via playwright-core.
// Covers: visual layout, login, admin file upload, in-app EPUB reader with auto tracking,
// reader uploads, approval bonus, cycle close (promote / tickets / reward unlocks).
import { chromium } from "playwright-core";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const BASE = process.env.BASE_URL || "https://readleague-app.vercel.app";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = resolve("e2e-output");
await mkdir(OUT, { recursive: true });

const log = (...a) => console.log("·", ...a);
const screenshots = [];
async function shot(page, name) {
  const file = resolve(OUT, `${String(screenshots.length).padStart(2, "0")}-${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  screenshots.push(file);
  log(`  📸 ${name}`);
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((u) => /\/app(?:$|\/)|\/admin(?:$|\/)/.test(u.pathname), { timeout: 30_000 }),
    page.locator('button:has-text("Sign in")').click(),
  ]);
}

async function logout(page) {
  await page.locator('button:has-text("Log out")').first().click();
  await page.waitForURL((u) => u.pathname === "/", { timeout: 15_000 }).catch(() => {});
}

const browser = await chromium.launch({ executablePath: EDGE, channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" });
const mobile = await mobileCtx.newPage();

const errors = [];
for (const p of [page, mobile]) {
  p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  p.on("console", (msg) => { if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`); });
  p.on("response", (resp) => { if (resp.status() >= 500) errors.push(`HTTP ${resp.status()} ${resp.url()}`); });
}

const results = [];
async function step(label, fn) {
  try {
    log(label);
    await fn();
    results.push({ label, ok: true });
  } catch (e) {
    results.push({ label, ok: false, error: String(e?.message ?? e) });
    try { await shot(page, `FAIL-${label.replace(/[^a-z0-9]+/gi, "-").slice(0, 60)}`); } catch {}
    throw e;
  }
}

try {
  await step("Landing page (desktop)", async () => {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await shot(page, "01-landing-desktop");
  });

  await step("Landing page (mobile)", async () => {
    await mobile.goto(BASE, { waitUntil: "domcontentloaded" });
    await shot(mobile, "02-landing-mobile");
  });

  await step("Login as coordinator", async () => {
    await login(page, "coord@readleague.app", "readmore123");
    await shot(page, "03-admin-dashboard");
  });

  await step("Admin: visit all sub-pages", async () => {
    for (const [path, name] of [
      ["/admin/approvals", "admin-approvals"],
      ["/admin/books", "admin-books"],
      ["/admin/ladder", "admin-ladder"],
      ["/admin/users", "admin-users"],
      ["/admin/cycle", "admin-cycle"],
      ["/admin/announcements", "admin-announcements"],
      ["/admin/books/new", "admin-new-book"],
    ]) {
      await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
      await shot(page, name);
    }
  });

  const REWARD_TITLE = "E2E Reward " + Date.now();
  await step(`Admin creates a NEW locked-reward book ("${REWARD_TITLE}")`, async () => {
    await page.goto(BASE + "/admin/books/new", { waitUntil: "domcontentloaded" });
    await page.fill('input[name="title"]', REWARD_TITLE);
    await page.fill('input[name="author"]', "E2E Author");
    await page.selectOption('select[name="genre"]', "fiction");
    await page.selectOption('select[name="lockType"]', "league_top_n");
    await page.waitForSelector('select[name="lockLeagueId"]');
    await page.selectOption('select[name="lockLeagueId"]', "yoruba");
    await page.fill('input[name="lockPosition"]', "1");
    await page.fill('input[name="lockNote"]', "E2E reward Yoruba 1");
    await shot(page, "new-book-form");
    await page.locator('button:has-text("Create book")').click();
    await page.waitForURL(/\/admin\/books\/\d+/, { timeout: 30_000 });
    await shot(page, "new-book-detail");
  });

  await step("Logout coordinator", async () => { await logout(page); });

  await step("Login as reader (Kojo, Yoruba)", async () => {
    await login(page, "kojo@readleague.app", "readmore123");
    await shot(page, "reader-discover-desktop");
  });

  await step("Reader: mobile Discover with active bottom nav", async () => {
    await login(mobile, "kojo@readleague.app", "readmore123");
    await shot(mobile, "reader-discover-mobile");
    await mobile.goto(BASE + "/app/library", { waitUntil: "domcontentloaded" });
    await shot(mobile, "reader-library-mobile");
    await mobile.goto(BASE + "/app/leagues", { waitUntil: "domcontentloaded" });
    await shot(mobile, "reader-leagues-mobile");
    await mobile.goto(BASE + "/app/profile", { waitUntil: "domcontentloaded" });
    await shot(mobile, "reader-profile-mobile");
  });

  let openedBookHref;
  await step("Reader opens a book → in-app EPUB reader loads", async () => {
    await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
    // Pick "Meditations" if visible (small, fast EPUB) — otherwise first available
    const cand = await page.locator('a:has-text("Meditations")').first();
    if (await cand.count()) {
      await cand.click();
    } else {
      await page.locator('a[href^="/app/books/"]').first().click();
    }
    await page.waitForURL(/\/app\/books\/\d+/, { timeout: 15_000 });
    await shot(page, "reader-book-detail");
    const startBtn = page.locator('a:has-text("Start reading"), a:has-text("Continue"), a:has-text("Re-read")').first();
    openedBookHref = await startBtn.getAttribute("href");
    await startBtn.click();
    await page.waitForURL(/\/app\/read\/\d+/, { timeout: 15_000 });
    // Let the EPUB iframe render
    await page.waitForTimeout(8000);
    await shot(page, "reader-epub-opened");
  });

  await step("Reader: turn 3 pages in the EPUB", async () => {
    // react-reader renders next/prev arrows; try them, falling back to keyboard at body
    for (let i = 0; i < 3; i++) {
      const nextBtn = page.locator('button[aria-label="Next page"], button[aria-label="next page"], button[title="Next page"]').first();
      if (await nextBtn.count() > 0) {
        await nextBtn.click({ timeout: 3000 }).catch(() => {});
      } else {
        await page.keyboard.press("ArrowRight");
      }
      await page.waitForTimeout(1800);
    }
    await shot(page, "reader-epub-after-turns");
  });

  await step("Reader: wait for active-time minimum then save session", async () => {
    // Need >= 30 active seconds OR pages > 0 for Save to enable
    await page.waitForTimeout(32_000);
    await page.locator('button:has-text("Save session"), button:has-text("pts")').first().click({ timeout: 15_000 });
    await page.waitForTimeout(3000);
    await shot(page, "reader-epub-session-saved");
  });

  await step("Reader: discover shows updated weekly pts", async () => {
    await page.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
    await shot(page, "reader-discover-after-read");
  });

  await step("Reader uploads a tiny EPUB book", async () => {
    await page.goto(BASE + "/app/upload", { waitUntil: "domcontentloaded" });
    await shot(page, "reader-upload-form");
    await page.fill('input[name="title"]', "E2E Uploaded Book " + Date.now());
    await page.fill('input[name="author"]', "E2E Author");
    await page.selectOption('select[name="genre"]', "fiction");
    // Attach a small file — re-use a real public EPUB by downloading once, then upload
    const epubPath = resolve(OUT, "sample.epub");
    try {
      await readFile(epubPath);
    } catch {
      const resp = await page.context().request.get("https://standardebooks.org/ebooks/sun-tzu/the-art-of-war/lionel-giles/downloads/sun-tzu_the-art-of-war_lionel-giles.epub");
      if (resp.ok()) {
        const buf = await resp.body();
        await writeFile(epubPath, buf);
      }
    }
    await page.setInputFiles('input[name="file"]', epubPath);
    await page.locator('button:has-text("Submit for approval")').click();
    await page.waitForTimeout(8000);
    await shot(page, "reader-upload-submitted");
  });

  await step("Logout reader, login coordinator", async () => {
    await logout(page);
    await login(page, "coord@readleague.app", "readmore123");
  });

  await step("Coordinator approves the new pending book", async () => {
    await page.goto(BASE + "/admin/approvals", { waitUntil: "domcontentloaded" });
    await shot(page, "admin-approvals-with-pending");
    const approveCount = await page.locator('button:has-text("Approve")').count();
    if (approveCount > 0) {
      await page.locator('button:has-text("Approve")').first().click();
      await page.waitForTimeout(2000);
    }
    await shot(page, "admin-approvals-after");
  });

  await step("Coordinator closes the weekly cycle", async () => {
    await page.goto(BASE + "/admin/cycle", { waitUntil: "domcontentloaded" });
    page.once("dialog", (d) => d.accept());
    await page.locator('button:has-text("Close cycle now")').click();
    await page.waitForTimeout(6000);
    await shot(page, "cycle-closed");
    await page.goto(BASE + "/admin/ladder", { waitUntil: "domcontentloaded" });
    await shot(page, "ladder-after-cycle");
  });

  await step("Login as winner (King Osei) → reward shows in library", async () => {
    await logout(page);
    await login(page, "king@readleague.app", "readmore123");
    await page.goto(BASE + "/app/library", { waitUntil: "domcontentloaded" });
    await shot(page, "winner-library");
    const html = await page.content();
    if (!html.includes(REWARD_TITLE)) {
      throw new Error(`Winner library missing "${REWARD_TITLE}"`);
    }
    log(`  ✅ Winner library contains "${REWARD_TITLE}"`);
  });

  await step("Winner profile: stats/charts render", async () => {
    await page.goto(BASE + "/app/profile", { waitUntil: "domcontentloaded" });
    await shot(page, "winner-profile");
    await page.goto(BASE + "/app/leagues", { waitUntil: "domcontentloaded" });
    await shot(page, "winner-leagues-post-promotion");
  });
} catch (e) {
  log("✗ aborted:", e.message);
} finally {
  await browser.close();
  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  const report = { base: BASE, passed: ok, failed: fail, runtimeErrors: errors, steps: results, screenshots };
  await writeFile(resolve(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(`\n=== ${ok} passed / ${fail} failed ===`);
  if (errors.length) {
    console.log("Runtime issues (first 10):");
    for (const e of errors.slice(0, 10)) console.log("  -", e);
  }
  for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.label}${r.ok ? "" : "  →  " + r.error}`);
  process.exit(fail ? 1 : 0);
}
