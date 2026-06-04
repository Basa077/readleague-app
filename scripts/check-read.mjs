import { chromium } from "playwright-core";
import { resolve } from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const browser = await chromium.launch({ executablePath: EDGE, channel: "msedge", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 850 } })).newPage();
const issues = [];
page.on("console", (m) => { if (m.type() === "error") issues.push("console: " + m.text().slice(0, 160)); });
page.on("requestfailed", (r) => issues.push(`reqfailed: ${r.url().slice(0, 90)} — ${r.failure()?.errorText}`));
page.on("response", (r) => { if (r.status() >= 400) issues.push(`HTTP ${r.status()} ${r.url().slice(0, 90)}`); });

const log = [];
try {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "kojo@readleague.app");
  await page.fill('input[name="password"]', "readmore123");
  await Promise.all([
    page.waitForURL((u) => /\/app/.test(u.pathname), { timeout: 30000 }),
    page.locator('button:has-text("Sign in")').click(),
  ]);
  log.push("signed in → " + new URL(page.url()).pathname);

  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  const book = page.locator('a[href^="/app/books/"]').first();
  await book.click();
  await page.waitForURL(/\/app\/books\/\d+/, { timeout: 15000 });
  log.push("book detail → " + new URL(page.url()).pathname);

  const start = page.locator('a:has-text("Start reading"), a:has-text("Continue"), a:has-text("Re-read")').first();
  await start.click();
  await page.waitForURL(/\/app\/read\/\d+/, { timeout: 15000 });
  log.push("reader → " + new URL(page.url()).pathname);

  await page.waitForTimeout(Number(process.env.READ_WAIT || 9000)); // let epub/pdf load
  const shot = resolve("e2e-output", "reader.png");
  await page.screenshot({ path: shot, fullPage: false });
  log.push("screenshot: " + shot);

  const iframes = await page.locator("iframe").count();
  log.push("iframes in reader: " + iframes);
  // epubjs renders text into an iframe; check whether any iframe has body text
  let epubText = 0;
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue;
    try { epubText += ((await f.locator("body").innerText().catch(() => "")) || "").length; } catch {}
  }
  log.push("text inside reader iframes: " + epubText + " chars");
} catch (e) {
  issues.push("flow: " + e.message);
}
await browser.close();

console.log("BASE: " + BASE);
for (const l of log) console.log("  " + l);
console.log(issues.length ? "ISSUES:\n  " + issues.slice(0, 14).join("\n  ") : "no network/console errors");
