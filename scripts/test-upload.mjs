import { chromium } from "playwright-core";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE_URL || "https://readleague-app.vercel.app";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const file = resolve("public/books", readdirSync("public/books").find((f) => f.endsWith(".epub")));

const b = await chromium.launch({ executablePath: EDGE, channel: "msedge", headless: true });
const p = await (await b.newContext()).newPage();
const errors = [];
p.on("response", (r) => { if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url().slice(0, 60)}`); });

await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await p.fill('input[name="email"]', "kojo@readleague.app");
await p.fill('input[name="password"]', "readmore123");
await Promise.all([p.waitForURL((u) => /\/app/.test(u.pathname), { timeout: 30000 }), p.locator('button:has-text("Sign in")').click()]);

await p.goto(`${BASE}/app/upload`, { waitUntil: "domcontentloaded" });
const title = "Upload Test " + Date.now();
await p.fill('input[name="title"]', title);
await p.fill('input[name="author"]', "Test Author");
await p.selectOption('select[name="genre"]', "fiction");
await p.setInputFiles('input[name="file"]', file);
console.log("uploading:", file.split(/[\\/]/).pop());
await p.locator('button:has-text("Submit for approval")').click();
await p.waitForTimeout(9000);
const t = (await p.locator("body").innerText()) || "";
const ok = /Submitted/i.test(t);
const msg = (t.match(/too large|access denied|upload failed|please attach|invalid/i) || [])[0];
console.log("upload result →", ok ? "✅ SUBMITTED (Blob works!)" : "❌ not submitted", msg ? `| msg: ${msg}` : "");
if (errors.length) console.log("5xx:", errors.slice(0, 3).join(" ; "));
await b.close();
