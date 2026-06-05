// Finds a real, readable public-domain EPUB for a requested title/author. This
// is the engine behind the "request a book" flow: when a reader searches for
// something we don't have and a free copy exists, we fetch a working file and
// add it to the library automatically. We only ever store the upstream URL —
// readers stream it through /api/book-file — so the library scales to any size
// with zero storage cost.
//
// Two independent providers, so one being down doesn't break the feature:
//   1. Gutendex (Project Gutenberg API)  — best quality for classics
//   2. Open Library → Internet Archive    — broad coverage of scanned public-domain works
// Every candidate is validated (the file really begins with the EPUB/zip magic
// bytes) before we commit it, so we never add a dead link.

export type FoundBook = {
  title: string;
  author: string;
  genre: string;
  fileUrl: string;
  coverUrl: string | null;
  year: number | null;
  source: "gutenberg" | "archive";
  sourceId: string;
};

const UA = "Mozilla/5.0 ReadLeague";
const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

function pickGenre(subjects: string[]): string {
  const hay = subjects.join(" | ").toLowerCase();
  if (/science fiction|fantasy/.test(hay)) return "sci";
  if (/poetry|poems/.test(hay)) return "poetry";
  if (/history|historical|war/.test(hay)) return "history";
  if (/philosophy|ethics|conduct of life/.test(hay)) return "self";
  if (/biography|autobiography|letters|essays|science|natural history/.test(hay)) return "nonfic";
  return "fiction";
}

/** Confirm a URL really serves an EPUB (starts with the "PK" zip magic bytes). */
async function isLiveEpub(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, {
      headers: { Range: "bytes=0-3", "User-Agent": UA },
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
    });
    if (!r.ok && r.status !== 206) return false;
    const buf = new Uint8Array(await r.arrayBuffer());
    return buf[0] === 0x50 && buf[1] === 0x4b; // "PK"
  } catch {
    return false;
  }
}

// ── Provider 1: Gutendex (Project Gutenberg) ──────────────────────────────────
type GBook = {
  id: number;
  title: string;
  authors: { name: string }[];
  subjects?: string[];
  bookshelves?: string[];
  formats: Record<string, string>;
  download_count?: number;
  copyright?: boolean | null;
};

function gAuthor(name?: string): string {
  if (!name) return "Unknown";
  const parts = name.split(",").map((s) => s.trim());
  return parts.length === 2 && parts[1] ? `${parts[1]} ${parts[0]}` : name;
}
function gEpub(b: GBook): string | null {
  for (const [k, v] of Object.entries(b.formats || {}))
    if (k.startsWith("application/epub+zip")) return v;
  return null;
}
function gCover(b: GBook): string | null {
  for (const [k, v] of Object.entries(b.formats || {})) if (k.startsWith("image/jpeg")) return v;
  return null;
}
function gScore(b: GBook, nq: string): number {
  const title = norm(b.title);
  let s = 0;
  if (title === nq) s += 100;
  else if (title.startsWith(nq) || nq.startsWith(title)) s += 60;
  else if (title.includes(nq) || nq.includes(title)) s += 30;
  s += Math.min(20, Math.log10((b.download_count || 0) + 1) * 4);
  return s;
}

async function fromGutendex(query: string): Promise<FoundBook | null> {
  let data: { results: GBook[] } | null = null;
  try {
    // One short attempt — Gutendex is a hobby API and sometimes unreachable; if
    // so we fall through to Open Library rather than making the reader wait.
    const r = await fetch(`https://gutendex.com/books?search=${encodeURIComponent(query)}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(6000),
    });
    if (r.ok) data = (await r.json()) as { results: GBook[] };
  } catch {
    return null;
  }
  if (!data?.results?.length) return null;

  const nq = norm(query);
  const ranked = data.results
    .filter((b) => gEpub(b) && b.copyright !== true)
    .map((b) => ({ b, s: gScore(b, nq) }))
    .sort((a, b) => b.s - a.s);

  for (const { b } of ranked.slice(0, 4)) {
    const url = gEpub(b)!;
    if (await isLiveEpub(url)) {
      return {
        title: (b.title || "Untitled").slice(0, 200),
        author: gAuthor(b.authors?.[0]?.name),
        genre: pickGenre([...(b.subjects || []), ...(b.bookshelves || [])]),
        fileUrl: url,
        coverUrl: gCover(b),
        year: null, // Gutendex exposes author birth year, not publication year
        source: "gutenberg",
        sourceId: String(b.id),
      };
    }
  }
  return null;
}

// ── Provider 2: Open Library → Internet Archive ───────────────────────────────
type OLDoc = {
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  ia?: string[];
  ebook_access?: string;
  cover_i?: number;
  subject?: string[];
};

async function fromOpenLibrary(query: string): Promise<FoundBook | null> {
  let data: { docs: OLDoc[] } | null = null;
  try {
    const fields =
      "title,author_name,first_publish_year,ia,ebook_access,cover_i,subject";
    const r = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=${fields}&limit=12`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(9000) }
    );
    if (r.ok) data = (await r.json()) as { docs: OLDoc[] };
  } catch {
    return null;
  }
  if (!data?.docs?.length) return null;

  // Only fully public-domain ("public") items with an Internet Archive scan.
  const candidates = data.docs.filter((d) => d.ebook_access === "public" && d.ia?.length);

  for (const d of candidates.slice(0, 6)) {
    for (const ia of (d.ia || []).slice(0, 2)) {
      const url = `https://archive.org/download/${ia}/${ia}.epub`;
      if (await isLiveEpub(url)) {
        return {
          title: (d.title || "Untitled").slice(0, 200),
          author: d.author_name?.[0] ?? "Unknown",
          genre: pickGenre(d.subject || []),
          fileUrl: url,
          coverUrl: d.cover_i
            ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
            : null,
          year: d.first_publish_year ?? null,
          source: "archive",
          sourceId: ia,
        };
      }
    }
  }
  return null;
}

/**
 * Search free public-domain libraries for a book matching `query` (title and/or
 * author). Returns the best validated EPUB match, or null if nothing free fits.
 */
export async function findFreeBook(query: string): Promise<FoundBook | null> {
  const q = query.trim();
  if (q.length < 2) return null;
  // Query both providers concurrently so total latency is the slower one, not
  // the sum (matters most while Gutendex is timing out). Prefer Gutendex's
  // result when both succeed — its EPUBs are cleaner than IA scans.
  const [g, ol] = await Promise.allSettled([fromGutendex(q), fromOpenLibrary(q)]);
  const gv = g.status === "fulfilled" ? g.value : null;
  const olv = ol.status === "fulfilled" ? ol.value : null;
  return gv ?? olv;
}
