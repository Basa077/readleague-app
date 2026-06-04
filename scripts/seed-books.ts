// Populate the library with real, working public-domain EPUBs from Project
// Gutenberg (served to the reader through our /api/book-file proxy).
// Keeps users / leagues / cycles — only replaces books + their reading data.
//
//   npm run db:books            # curated set + up to default target from Gutendex
//   npm run db:books -- 800     # aim for ~800 total
//
// Strategy: insert a curated, hand-verified set FIRST (direct cache URLs, no API
// needed), then TRY the Gutendex API (with retries) to add hundreds more. If the
// API is down, you still get the curated library.
import { db, schema } from "@/db";
import type { NewBook } from "@/db/schema";

const TARGET = Number(process.argv[2] || 500);
const GUTENDEX = "https://gutendex.com/books";
const cacheUrl = (id: number) => `https://www.gutenberg.org/cache/epub/${id}/pg${id}.epub`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Curated, well-known titles (guaranteed; no API needed) ──
type Curated = { id: number; title: string; author: string; genre: string; lock?: Partial<NewBook> };
const CURATED: Curated[] = [
  { id: 1342, title: "Pride and Prejudice", author: "Jane Austen", genre: "fiction" },
  { id: 84, title: "Frankenstein", author: "Mary Shelley", genre: "fiction" },
  { id: 1661, title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", genre: "fiction" },
  { id: 174, title: "The Picture of Dorian Gray", author: "Oscar Wilde", genre: "fiction" },
  { id: 2701, title: "Moby Dick", author: "Herman Melville", genre: "fiction" },
  { id: 98, title: "A Tale of Two Cities", author: "Charles Dickens", genre: "fiction" },
  { id: 1400, title: "Great Expectations", author: "Charles Dickens", genre: "fiction" },
  { id: 11, title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", genre: "fiction" },
  { id: 345, title: "Dracula", author: "Bram Stoker", genre: "fiction" },
  { id: 76, title: "Adventures of Huckleberry Finn", author: "Mark Twain", genre: "fiction" },
  { id: 74, title: "The Adventures of Tom Sawyer", author: "Mark Twain", genre: "fiction" },
  { id: 1260, title: "Jane Eyre", author: "Charlotte Brontë", genre: "fiction" },
  { id: 768, title: "Wuthering Heights", author: "Emily Brontë", genre: "fiction" },
  { id: 64317, title: "The Great Gatsby", author: "F. Scott Fitzgerald", genre: "fiction" },
  { id: 2600, title: "War and Peace", author: "Leo Tolstoy", genre: "fiction" },
  { id: 5200, title: "Metamorphosis", author: "Franz Kafka", genre: "fiction" },
  { id: 2814, title: "Dubliners", author: "James Joyce", genre: "fiction" },
  { id: 996, title: "Don Quixote", author: "Miguel de Cervantes", genre: "fiction" },
  { id: 25344, title: "The Scarlet Letter", author: "Nathaniel Hawthorne", genre: "fiction" },
  { id: 158, title: "Emma", author: "Jane Austen", genre: "fiction" },
  { id: 161, title: "Sense and Sensibility", author: "Jane Austen", genre: "fiction" },
  { id: 1184, title: "The Count of Monte Cristo", author: "Alexandre Dumas", genre: "fiction" },
  { id: 209, title: "The Turn of the Screw", author: "Henry James", genre: "fiction" },
  { id: 2591, title: "Grimms' Fairy Tales", author: "The Brothers Grimm", genre: "fiction" },
  { id: 35, title: "The Time Machine", author: "H. G. Wells", genre: "sci" },
  { id: 36, title: "The War of the Worlds", author: "H. G. Wells", genre: "sci" },
  { id: 164, title: "Twenty Thousand Leagues under the Sea", author: "Jules Verne", genre: "sci" },
  { id: 43, title: "The Strange Case of Dr. Jekyll and Mr. Hyde", author: "Robert Louis Stevenson", genre: "fiction" },
  { id: 120, title: "Treasure Island", author: "Robert Louis Stevenson", genre: "fiction" },
  { id: 219, title: "Heart of Darkness", author: "Joseph Conrad", genre: "fiction" },
  { id: 215, title: "The Call of the Wild", author: "Jack London", genre: "fiction" },
  { id: 1952, title: "The Yellow Wallpaper", author: "Charlotte Perkins Gilman", genre: "fiction" },
  { id: 1727, title: "The Odyssey", author: "Homer", genre: "poetry" },
  { id: 1232, title: "The Prince", author: "Niccolò Machiavelli", genre: "nonfic" },
  { id: 132, title: "The Art of War", author: "Sun Tzu", genre: "history" },
  { id: 1080, title: "A Modest Proposal", author: "Jonathan Swift", genre: "nonfic" },
  { id: 2542, title: "A Doll's House", author: "Henrik Ibsen", genre: "fiction" },
  { id: 4300, title: "Ulysses", author: "James Joyce", genre: "fiction" },
  // ── Reward books (preserve the league-unlock demo) ──
  { id: 1497, title: "The Republic", author: "Plato", genre: "academic", lock: { lockType: "league_winner", lockLeagueId: "asante", lockNote: "Champion's reading" } },
  { id: 6130, title: "The Iliad", author: "Homer", genre: "poetry", lock: { lockType: "league_top_n", lockLeagueId: "yoruba", lockPosition: 4, lockNote: "Top 4 of Yoruba" } },
  { id: 16328, title: "Beowulf", author: "Anonymous", genre: "poetry", lock: { lockType: "admin_grant", lockNote: "Coordinator pick" } },
];

// ── Gutendex (bulk) helpers ──
type GBook = { id: number; title: string; authors: { name: string }[]; subjects?: string[]; bookshelves?: string[]; formats: Record<string, string> };

function fmtAuthor(name?: string): string {
  if (!name) return "Unknown";
  const parts = name.split(",").map((s) => s.trim());
  return parts.length === 2 && parts[1] ? `${parts[1]} ${parts[0]}` : name;
}
function pickGenre(b: GBook): string {
  const hay = [...(b.subjects || []), ...(b.bookshelves || [])].join(" | ").toLowerCase();
  if (/science fiction|fantasy/.test(hay)) return "sci";
  if (/poetry|poems/.test(hay)) return "poetry";
  if (/history|historical|war/.test(hay)) return "history";
  if (/philosophy|ethics|conduct of life/.test(hay)) return "self";
  if (/biography|autobiography|letters|essays|science|natural history/.test(hay)) return "nonfic";
  return "fiction";
}
function epubUrl(b: GBook): string | null {
  for (const [k, v] of Object.entries(b.formats || {})) if (k.startsWith("application/epub+zip")) return v;
  return null;
}
async function fetchJson<T>(url: string, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 ReadLeague-seed" } });
      if (r.ok) return (await r.json()) as T;
      lastErr = new Error(`HTTP ${r.status}`);
    } catch (e) { lastErr = e; }
    await sleep(500 * 2 ** i); // 0.5s, 1s, 2s — fail fast, we have the curated set
  }
  throw lastErr;
}

async function main() {
  console.log(`Seeding catalog (target ${TARGET})…`);

  await db.delete(schema.bookUnlocks);
  await db.delete(schema.readingSessions);
  await db.delete(schema.userProgress);
  await db.delete(schema.books);
  console.log("  ✓ cleared old books + reading data (users & leagues kept)");

  const seen = new Set<number>();
  let total = 0;

  // 1) curated — insert immediately so the library is never left empty
  const curatedRows: NewBook[] = CURATED.map((c) => {
    seen.add(c.id);
    return { title: c.title, author: c.author, genre: c.genre, format: "EPUB", fileUrl: cacheUrl(c.id), status: "approved", lockType: "open", ...(c.lock || {}) };
  });
  await db.insert(schema.books).values(curatedRows);
  total += curatedRows.length;
  console.log(`  ✓ ${total} curated titles inserted`);

  // 2) bulk from Gutendex — insert each page as it arrives so progress persists
  try {
    let pageUrl: string | null = `${GUTENDEX}?languages=en&page=1`;
    while (pageUrl && total < TARGET) {
      const data: { results: GBook[]; next: string | null } = await fetchJson(pageUrl);
      const batch: NewBook[] = [];
      for (const b of data.results) {
        const url = epubUrl(b);
        if (seen.has(b.id) || !url) continue;
        seen.add(b.id);
        batch.push({ title: (b.title || "Untitled").slice(0, 150), author: fmtAuthor(b.authors?.[0]?.name), genre: pickGenre(b), format: "EPUB", fileUrl: url, status: "approved", lockType: "open" });
        if (total + batch.length >= TARGET) break;
      }
      if (batch.length) { await db.insert(schema.books).values(batch); total += batch.length; }
      pageUrl = data.next;
      process.stdout.write(`\r  total ${total}/${TARGET}…`);
      await sleep(300); // be polite
    }
    console.log("");
  } catch (e) {
    console.log(`\n  ⚠ Gutendex stopped early (${String(e)}) — kept ${total} books.`);
  }

  console.log(`  ✓ done — ${total} books in the library`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
