import { chromium } from "playwright-core";
const BASE = process.env.BASE_URL || "https://readleague-app.vercel.app";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const EMAIL = process.env.EMAIL || "kojo@readleague.app";
const b = await chromium.launch({ executablePath: EDGE, channel: "msedge", headless: true });
const p = await (await b.newContext()).newPage();
async function go(path) {
  try {
    const r = await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 20000 });
    console.log(`  ${path.padEnd(10)} → ${r ? r.status() : "?"}  ${new URL(p.url()).pathname}`);
  } catch (e) { console.log(`  ${path.padEnd(10)} → ERROR: ${String(e.message).split("\n")[0]}`); }
}
console.log(`login as ${EMAIL}`);
await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await p.fill('input[name="email"]', EMAIL);
await p.fill('input[name="password"]', "readmore123");
await Promise.all([p.waitForURL(u=>/\/app|\/admin/.test(u.pathname),{timeout:30000}).catch(()=>{}), p.locator('button:has-text("Sign in")').click()]);
console.log("after login at:", new URL(p.url()).pathname);
for (const path of ["/", "/login", "/app", "/admin"]) await go(path);
await b.close();
