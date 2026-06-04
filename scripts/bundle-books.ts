// Download a curated set of OPEN books and store them as static files in
// public/books/<id>.epub, then point each book at /books/<id>.epub. Vercel serves
// public/ from its CDN, so these load in a couple of seconds (no live Gutenberg
// round-trip). Reward (locked) books stay on the proxy for access control.
//
//   npm run bundle-books            # bundle up to 40 open books
//   npm run bundle-books -- 60
import { db, schema } from "@/db";
import { asc, eq, and, or, isNull, notLike } from "drizzle-orm";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const LIMIT = Number(process.argv[2] || 40);
const OUT = resolve("public", "books");

function gutenbergId(url: string): string | null {
  const m = url.match(/(?:ebooks\/(\d+)|cache\/epub\/(\d+))/);
  return m ? m[1] || m[2] : null;
}
async function dl(url: string): Promise<Buffer | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ReadLeague" }, redirect: "follow" });
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b ? buf : null; // PK zip
  } catch { return null; }
}
async function fetchEpub(fileUrl: string): Promise<Buffer | null> {
  const id = gutenbergId(fileUrl);
  const tries = id
    ? [`https://www.gutenberg.org/ebooks/${id}.epub.noimages`, `https://www.gutenberg.org/ebooks/${id}.epub.images`, fileUrl]
    : [fileUrl];
  for (const u of tries) { const b = await dl(u); if (b) return b; }
  return null;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const open = await db
    .select({ id: schema.books.id, title: schema.books.title, fileUrl: schema.books.fileUrl })
    .from(schema.books)
    .where(eq(schema.books.lockType, "open"))
    .orderBy(asc(schema.books.id))
    .limit(LIMIT);
  console.log(`Bundling up to ${open.length} open books into public/books/ …`);

  let done = 0, idx = 0;
  const worker = async () => {
    while (idx < open.length) {
      const b = open[idx++];
      if (!b.fileUrl) continue;
      if (b.fileUrl.startsWith("/books/")) { done++; continue; } // already bundled (resume)
      const buf = await fetchEpub(b.fileUrl);
      if (!buf) { console.log(`\n  ✗ ${b.id} ${b.title.slice(0, 30)}`); continue; }
      await writeFile(resolve(OUT, `${b.id}.epub`), buf);
      await db.update(schema.books).set({ fileUrl: `/books/${b.id}.epub` }).where(eq(schema.books.id, b.id));
      done++;
      process.stdout.write(`\r  bundled ${done}/${open.length}…`);
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  console.log(`\n  ✓ bundled ${done} books`);

  // Safety: never wipe the library if bundling mostly failed.
  if (done < 10) {
    console.log("  ⚠ fewer than 10 bundled — leaving the rest in place (no delete).");
    process.exit(0);
  }

  // Remove OPEN books that didn't get bundled, so every browsable book is fast.
  const del = await db
    .delete(schema.books)
    .where(and(eq(schema.books.lockType, "open"), or(isNull(schema.books.fileUrl), notLike(schema.books.fileUrl, "/books/%"))))
    .returning({ id: schema.books.id });
  console.log(`  ✓ removed ${del.length} un-bundled open books (reward books kept)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
