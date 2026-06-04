// Open several books in a real browser and report which render vs error/stall.
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function main() {
  const all = await db.select({ id: schema.books.id, title: schema.books.title, fileUrl: schema.books.fileUrl })
    .from(schema.books).orderBy(asc(schema.books.id));
  // sample: 4 earliest (curated, cache URLs) + 4 from the middle (bulk, gutendex URLs)
  const sample = [...all.slice(0, 4), ...all.slice(Math.floor(all.length / 2), Math.floor(all.length / 2) + 4)];

  const browser = await chromium.launch({ executablePath: EDGE, channel: "msedge", headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 760 } })).newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "kojo@readleague.app");
  await page.fill('input[name="password"]', "readmore123");
  await Promise.all([page.waitForURL((u) => /\/app/.test(u.pathname), { timeout: 30000 }), page.locator('button:has-text("Sign in")').click()]);

  for (const b of sample) {
    const shape = (b.fileUrl || "").replace(/^https?:\/\/[^/]+/, "").replace(/\d+/g, "#");
    let verdict = "?";
    try {
      await page.goto(`${BASE}/app/read/${b.id}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(14000);
      const body = (await page.locator("body").innerText().catch(() => "")) || "";
      let frameText = 0;
      for (const f of page.frames()) { if (f !== page.mainFrame()) try { frameText += ((await f.locator("body").innerText().catch(() => "")) || "").length; } catch {} }
      if (/Error loading book/i.test(body)) verdict = "❌ ERROR";
      else if (frameText > 500) verdict = `✅ ok (${frameText} chars)`;
      else verdict = "⏳ stalled/blank";
    } catch (e) { verdict = "✗ " + String((e as Error).message).slice(0, 30); }
    console.log(`#${String(b.id).padEnd(4)} ${verdict.padEnd(22)} ${shape}  | ${b.title.slice(0, 30)}`);
  }
  await browser.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
