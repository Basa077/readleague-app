// Test every book's fileUrl and report which actually return a real EPUB.
import { db, schema } from "@/db";

type Row = { id: number; title: string; fileUrl: string | null };

async function test(url: string): Promise<{ ok: boolean; reason: string }> {
  try {
    const r = await fetch(url, { headers: { Range: "bytes=0-15", "User-Agent": "Mozilla/5.0 ReadLeague" }, redirect: "follow" });
    if (!r.ok && r.status !== 206) return { ok: false, reason: `HTTP ${r.status}` };
    const buf = new Uint8Array(await r.arrayBuffer());
    const magic = String.fromCharCode(buf[0] ?? 0, buf[1] ?? 0);
    if (magic === "PK") return { ok: true, reason: "epub" };
    return { ok: false, reason: `not-zip (${(r.headers.get("content-type") || "?").slice(0, 30)})` };
  } catch (e) {
    return { ok: false, reason: `err ${String((e as Error).message).slice(0, 40)}` };
  }
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function main() {
  const books = (await db.select({ id: schema.books.id, title: schema.books.title, fileUrl: schema.books.fileUrl }).from(schema.books)) as Row[];
  console.log(`testing ${books.length} book URLs…`);
  const fails: { id: number; title: string; url: string; reason: string }[] = [];
  let ok = 0;
  await pool(books, 12, async (b) => {
    if (!b.fileUrl) { fails.push({ id: b.id, title: b.title, url: "(none)", reason: "no url" }); return; }
    const res = await test(b.fileUrl);
    if (res.ok) ok++;
    else fails.push({ id: b.id, title: b.title, url: b.fileUrl, reason: res.reason });
  });
  console.log(`\nOK: ${ok} / ${books.length}   FAIL: ${fails.length}`);
  // group failures by URL shape
  const byShape: Record<string, number> = {};
  for (const f of fails) {
    const shape = f.url.replace(/\d+/g, "#").replace(/^https?:\/\/([^/]+).*/, "$1 …") + " | " + f.reason;
    byShape[shape] = (byShape[shape] || 0) + 1;
  }
  console.log("\nfailure groups:");
  for (const [s, c] of Object.entries(byShape).sort((a, b) => b[1] - a[1])) console.log(`  ${c}×  ${s}`);
  console.log("\nfirst 12 failing books:");
  for (const f of fails.slice(0, 12)) console.log(`  #${f.id} ${f.title.slice(0, 28).padEnd(28)} ${f.reason}  ${f.url}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
