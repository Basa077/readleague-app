// Capture what a new visitor sees. Screenshots to e2e-output/tour-*.png
import { chromium } from "playwright-core";
import { resolve } from "node:path";

const BASE = process.env.BASE_URL || "https://readleague-app.vercel.app";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const shot = async (page, name) => { await page.screenshot({ path: resolve("e2e-output", `tour-${name}.png`), fullPage: false }); console.log("  📸", name); };

const browser = await chromium.launch({ executablePath: EDGE, channel: "msedge", headless: true });

// Desktop visitor
const page = await (await browser.newContext({ viewport: { width: 1200, height: 820 } })).newPage();
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(1500); await shot(page, "1-landing");
await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(800); await shot(page, "2-signup");

// Sign in as a reader to show the app
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.fill('input[name="email"]', "kojo@readleague.app");
await page.fill('input[name="password"]', "readmore123");
await Promise.all([page.waitForURL((u) => /\/app/.test(u.pathname), { timeout: 30000 }), page.locator('button:has-text("Sign in")').click()]);
await page.waitForTimeout(1500); await shot(page, "3-discover");
await page.goto(`${BASE}/app/library`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(1500); await shot(page, "4-library");
await page.goto(`${BASE}/app/leagues`, { waitUntil: "domcontentloaded" }); await page.waitForTimeout(1500); await shot(page, "5-leagues");

// Open a book
await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
await page.locator('a[href^="/app/books/"]').first().click();
await page.waitForURL(/\/app\/books\/\d+/, { timeout: 15000 });
await page.locator('a:has-text("Start reading"), a:has-text("Continue"), a:has-text("Re-read")').first().click();
await page.waitForURL(/\/app\/read\/\d+/, { timeout: 15000 });
await page.waitForTimeout(4000); await shot(page, "6-reading");

// Mobile view of discover
const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1" })).newPage();
await m.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await m.fill('input[name="email"]', "kojo@readleague.app");
await m.fill('input[name="password"]', "readmore123");
await Promise.all([m.waitForURL((u) => /\/app/.test(u.pathname), { timeout: 30000 }), m.locator('button:has-text("Sign in")').click()]);
await m.waitForTimeout(1500); await shot(m, "7-mobile-discover");

await browser.close();
console.log("done");
