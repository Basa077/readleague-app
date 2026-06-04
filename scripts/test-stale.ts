// Forge a validly-signed session for a non-existent user and confirm the app
// breaks out of it cleanly (→ /login) instead of looping.
import { encodeSession } from "@/lib/session";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

async function main() {
  const token = await encodeSession({ userId: 999999, role: "reader", exp: Math.floor(Date.now() / 1000) + 3600 });
  const b = await chromium.launch({ executablePath: EDGE, channel: "msedge", headless: true });
  const ctx = await b.newContext();
  const url = new URL(BASE);
  await ctx.addCookies([{ name: "rl_session", value: token, domain: url.hostname, path: "/", httpOnly: true }]);
  const p = await ctx.newPage();
  let result = "?";
  try {
    const r = await p.goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 20000 });
    result = `OK → HTTP ${r?.status()} at ${new URL(p.url()).pathname}`;
  } catch (e) {
    result = `ERROR: ${String((e as Error).message).split("\n")[0]}`;
  }
  console.log("stale session /app →", result);
  await b.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
