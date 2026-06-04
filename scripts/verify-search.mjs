import { chromium } from "playwright-core";
const BASE = process.env.BASE_URL || "https://readleague-app.vercel.app";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const b = await chromium.launch({ executablePath: EDGE, channel: "msedge", headless: true });

async function login(email, pass) {
  const p = await (await b.newContext()).newPage();
  await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="password"]', pass);
  await Promise.all([
    p.waitForURL((u) => /\/admin|\/app/.test(u.pathname), { timeout: 30000 }).catch(() => {}),
    p.locator('button:has-text("Sign in")').click(),
  ]);
  return p;
}

const admin = await login("coord@readleague.app", "fLexSnNgnk3MU8");
console.log("admin login →", new URL(admin.url()).pathname, "(expect /admin)");

const reader = await login("kojo@readleague.app", "readmore123");
for (const term of ["Frankenstein", "zzxqwzz"]) {
  await reader.goto(`${BASE}/app/search?q=${term}`, { waitUntil: "domcontentloaded" });
  await reader.waitForTimeout(900);
  const t = await reader.locator("body").innerText();
  const verdict = /No match/i.test(t) ? "no match → 'not available' ✓" : (/result/i.test(t) ? "RESULTS ✓" : "?");
  console.log(`search "${term}" →`, verdict);
}
await b.close();
