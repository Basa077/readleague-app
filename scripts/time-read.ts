// Measure how long books take to actually render, on a given BASE_URL.
import { db, schema } from "@/db";
import { asc } from "drizzle-orm";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function main() {
  const all = await db.select({ id: schema.books.id, title: schema.books.title })
    .from(schema.books).orderBy(asc(schema.books.id));
  const sample = [all[0], all[1], all[Math.floor(all.length / 2)], all[all.length - 1]].filter(Boolean);

  const browser = await chromium.launch({ executablePath: EDGE, channel: "msedge", headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 760 } })).newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', "kojo@readleague.app");
  await page.fill('input[name="password"]', "readmore123");
  await Promise.all([page.waitForURL((u) => /\/app/.test(u.pathname), { timeout: 30000 }), page.locator('button:has-text("Sign in")').click()]);

  console.log(`BASE: ${BASE}`);
  for (const b of sample) {
    await page.goto(`${BASE}/app/read/${b.id}`, { waitUntil: "domcontentloaded" });
    const t0 = Date.now();
    let secs = "timeout(>40s)";
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(1000);
      let txt = 0;
      for (const f of page.frames()) { if (f !== page.mainFrame()) try { txt += ((await f.locator("body").innerText().catch(() => "")) || "").length; } catch {} }
      const body = (await page.locator("body").innerText().catch(() => "")) || "";
      if (/Error loading book/i.test(body)) { secs = "ERROR"; break; }
      if (txt > 800) { secs = `${((Date.now() - t0) / 1000).toFixed(1)}s`; break; }
    }
    console.log(`  #${String(b.id).padEnd(4)} ${secs.padEnd(14)} ${b.title.slice(0, 34)}`);
  }
  await browser.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
