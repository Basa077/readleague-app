// Quick login smoke test against a running server (default: local dev).
// Usage: node scripts/smoke-login.mjs   [BASE_URL=http://localhost:3000]
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const EMAIL = process.env.SMOKE_EMAIL || "coord@readleague.app";
const PASS = process.env.SMOKE_PASS || "readmore123";

const browser = await chromium.launch({ executablePath: EDGE, channel: "msedge", headless: true });
const page = await (await browser.newContext()).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e.message)));
page.on("response", (r) => { if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url()}`); });

let ok = false, landed = "";
try {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASS);
  await Promise.all([
    page.waitForURL((u) => /\/admin(?:$|\/)|\/app(?:$|\/)/.test(u.pathname), { timeout: 30000 }),
    page.locator('button:has-text("Sign in")').click(),
  ]);
  landed = new URL(page.url()).pathname;
  ok = true;
} catch (e) {
  errors.push(`login flow: ${e.message}`);
}
await browser.close();

console.log(`base       : ${BASE}`);
console.log(`login as   : ${EMAIL}`);
console.log(`result     : ${ok ? "✅ SIGNED IN → " + landed : "❌ FAILED"}`);
if (errors.length) { console.log("issues:"); for (const e of errors.slice(0, 8)) console.log("  - " + e); }
process.exit(ok && errors.length === 0 ? 0 : 1);
