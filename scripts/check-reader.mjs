// Log in as a reader and visit every reader page, capturing runtime errors and
// confirming each page actually renders. Usage:
//   node scripts/check-reader.mjs            (local)
//   BASE_URL=https://readleague-app.vercel.app node scripts/check-reader.mjs
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const EMAIL = process.env.SMOKE_EMAIL || "kojo@readleague.app";
const PASS = process.env.SMOKE_PASS || "readmore123";

const browser = await chromium.launch({ executablePath: EDGE, channel: "msedge", headless: true });
const page = await (await browser.newContext()).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`console.error: ${m.text()}`); });
page.on("response", (r) => { if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`); });

const out = [];
try {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await Promise.all([
    page.waitForURL((u) => /\/app(?:$|\/)|\/admin(?:$|\/)/.test(u.pathname), { timeout: 30000 }),
    page.locator('button:has-text("Sign in")').click(),
  ]);
  out.push(`login → ${new URL(page.url()).pathname}`);

  for (const path of ["/app", "/app/library", "/app/leagues", "/app/profile", "/app/upload"]) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const text = (await page.locator("body").innerText().catch(() => "")) || "";
    const hasErrorOverlay = /Unhandled Runtime Error|Application error|This page could not be found/i.test(text);
    out.push(`${path.padEnd(16)} ${hasErrorOverlay ? "❌ ERROR PAGE" : "✓ rendered (" + text.length + " chars)"}`);
  }
} catch (e) {
  errors.push(`flow: ${e.message}`);
}
await browser.close();

console.log(`base: ${BASE}  user: ${EMAIL}`);
for (const l of out) console.log("  " + l);
console.log(errors.length ? "ISSUES:\n  " + errors.slice(0, 10).join("\n  ") : "no runtime errors ✔");
process.exit(errors.length ? 1 : 0);
