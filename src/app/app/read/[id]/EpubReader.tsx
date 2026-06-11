"use client";

import { useEffect, useRef, useState } from "react";
import { ReactReader } from "react-reader";
import type { Contents, Rendition } from "epubjs";
import { colorMeta, citedClipboardText, type HighlightColorKey } from "@/lib/annotations";
import { useAnnotations, type Anno } from "./useAnnotations";
import { ColorSwatches, NoteEditor, NotesPanel } from "./AnnotationUI";
import { useReadAloud, toChunks } from "./useReadAloud";
import { ListenControls } from "./ListenControls";

type TocItem = { label: string; href: string; depth: number };
type EpubAnnotations = {
  add: (type: string, cfiRange: string, data: object, cb: (e: Event) => void, className: string, styles: object) => void;
  remove: (cfiRange: string, type: string) => void;
};

export function EpubReader({
  url,
  initialCfi,
  bookId,
  citation,
  onCfi,
  onTotalPages,
  onContext,
}: {
  url: string;
  initialCfi?: string;
  bookId: number;
  citation: string;
  onCfi: (cfi: string, page: number) => void;
  onTotalPages: (total: number) => void;
  onContext?: (text: string) => void;
}) {
  const [location, setLocation] = useState<string | number | null>(initialCfi ?? null);
  const renditionRef = useRef<Rendition | null>(null);
  const [estPage, setEstPage] = useState(1);
  const [estTotal, setEstTotal] = useState(0);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [showSheets, setShowSheets] = useState(false);

  // Annotations
  const { items, add, update, remove } = useAnnotations(bookId);
  // Armed marker pen. null = off → selecting text shows the palette.
  // A colour = held → selecting text highlights instantly in that colour.
  const [marker, setMarker] = useState<HighlightColorKey | null>(null);
  const markerRef = useRef<HighlightColorKey | null>(null);
  markerRef.current = marker;
  const [epubSel, setEpubSel] = useState<{ cfiRange: string; text: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [renditionReady, setRenditionReady] = useState(false);
  const selContents = useRef<Contents | null>(null);
  const drawn = useRef<Map<string, string>>(new Map()); // cfiRange -> "id:color"
  const editing = editingId != null ? items.find((a) => a.id === editingId) ?? null : null;
  const myCount = items.filter((a) => a.mine).length;

  useEffect(() => {
    return () => { renditionRef.current = null; };
  }, []);

  // Draw / reconcile saved highlights onto the rendition.
  useEffect(() => {
    const r = renditionRef.current;
    if (!r || !renditionReady) return;
    const anns = r.annotations as unknown as EpubAnnotations;
    const want = new Map<string, Anno>();
    for (const a of items) if (a.cfiRange && a.kind === "highlight") want.set(a.cfiRange, a);

    for (const [cfi, a] of want) {
      const sig = `${a.id}:${a.color}`;
      if (drawn.current.get(cfi) !== sig) {
        if (drawn.current.has(cfi)) { try { anns.remove(cfi, "highlight"); } catch {} }
        try {
          anns.add("highlight", cfi, {}, () => setEditingId(a.id), "rl-hl", {
            fill: colorMeta(a.color).hex, "fill-opacity": "0.32", "mix-blend-mode": "multiply",
          });
          drawn.current.set(cfi, sig);
        } catch {}
      }
    }
    for (const cfi of Array.from(drawn.current.keys())) {
      if (!want.has(cfi)) { try { anns.remove(cfi, "highlight"); } catch {} drawn.current.delete(cfi); }
    }
  }, [items, renditionReady]);

  // Persist a highlight from a cfiRange (used by both the palette and the armed
  // pen). Held in a ref so the once-registered "selected" handler always reaches
  // the latest state (add / estPage change every render).
  const applyRef = useRef<(cfiRange: string, text: string, color: HighlightColorKey, openEditor: boolean) => Promise<void>>(async () => {});
  applyRef.current = async (cfiRange, text, color, openEditor) => {
    const created = await add({ kind: "highlight", color, page: estPage, cfiRange, selectedText: text });
    if (created && openEditor) setEditingId(created.id);
  };

  async function applyEpubHighlight(color: HighlightColorKey) {
    const s = epubSel;
    if (!s) return;
    setEpubSel(null);
    selContents.current?.window.getSelection()?.removeAllRanges();
    await applyRef.current(s.cfiRange, s.text, color, true);
  }

  async function addPageNote() {
    const created = await add({ kind: "note", color: marker ?? "yellow", page: estPage });
    if (created) setEditingId(created.id);
  }

  // ── Read-aloud: speak the current chapter, then move to the next one. ──
  const ra = useReadAloud();
  function chapterText(): string {
    const r = renditionRef.current as unknown as { getContents?: () => Array<{ document?: Document }> } | null;
    const doc = r?.getContents?.()?.[0]?.document;
    return (doc?.body as HTMLElement | undefined)?.innerText ?? "";
  }
  async function advanceChapter(): Promise<boolean> {
    const r = renditionRef.current as unknown as {
      currentLocation?: () => { start?: { index?: number }; end?: { index?: number } };
      display?: (href: string) => Promise<void>;
      book?: { spine?: { spineItems?: Array<{ href: string }>; items?: Array<{ href: string }> } };
    } | null;
    if (!r) return false;
    const loc = r.currentLocation?.();
    const idx = loc?.end?.index ?? loc?.start?.index;
    const items = r.book?.spine?.spineItems ?? r.book?.spine?.items ?? [];
    if (idx == null || idx + 1 >= items.length) return false;
    await r.display?.(items[idx + 1].href);
    await new Promise((res) => setTimeout(res, 350));
    return true;
  }
  function startListening() {
    ra.play({ chunks: () => toChunks(chapterText()), advance: advanceChapter });
  }

  return (
    <div className="h-full w-full relative">
      <ReactReader
        url={url}
        location={location}
        locationChanged={(loc: string) => {
          setLocation(loc);
          let page = estPage;
          let total = estTotal;
          const r = renditionRef.current;
          if (r && r.book) {
            try {
              const locs = r.book.locations as unknown as {
                length: () => number;
                locationFromCfi: (cfi: string) => number;
              };
              if (typeof locs.length === "function") {
                total = locs.length();
                page = locs.locationFromCfi(loc) + 1;
                setEstPage(page);
                setEstTotal(total);
                if (total > 0) onTotalPages(total);
              }
            } catch { /* ignore */ }
          }
          onCfi(loc, page);
        }}
        getRendition={(rendition: Rendition) => {
          renditionRef.current = rendition;
          rendition.themes.fontSize("110%");
          rendition.hooks.content.register((contents: Contents) => {
            contents.document.documentElement.style.color = "var(--ink)";
            // Copy → append a citation so passages leave the book attributed.
            contents.document.addEventListener("copy", (e: ClipboardEvent) => {
              const s = contents.window.getSelection()?.toString() ?? "";
              if (!s.trim()) return;
              e.clipboardData?.setData("text/plain", citedClipboardText(s, citation));
              e.preventDefault();
            });
          });
          // Text selected → offer the highlight palette.
          rendition.on("selected", (cfiRange: string, contents: Contents) => {
            selContents.current = contents;
            let text = "";
            try {
              const rng = (rendition as unknown as { getRange?: (c: string) => Range }).getRange?.(cfiRange);
              text = rng?.toString() ?? contents.window.getSelection()?.toString() ?? "";
            } catch {
              text = contents.window.getSelection()?.toString() ?? "";
            }
            if (text.trim()) onContext?.(text);
            if (markerRef.current) {
              // Pen held → mark instantly and stay armed.
              contents.window.getSelection()?.removeAllRanges();
              void applyRef.current(cfiRange, text, markerRef.current, false);
            } else {
              setEpubSel({ cfiRange, text });
            }
          });
          // TOC for the chapter overview.
          rendition.book.loaded.navigation
            .then((nav: { toc: TocNavItem[] }) => setToc(flattenToc(nav.toc)))
            .catch(() => {});
          // Build the page-location index in the BACKGROUND so the first page
          // paints immediately instead of blocking on a full-book walk.
          rendition.book.ready.then(() => {
            setRenditionReady(true);
            setTimeout(() => {
              const locs = rendition.book.locations as unknown as {
                generate: (chars: number) => Promise<unknown>;
                length: () => number;
              };
              locs.generate(1600)
                .then(() => { const total = locs.length(); setEstTotal(total); onTotalPages(total); })
                .catch(() => {});
            }, 1200);
          });
        }}
        epubInitOptions={{ openAs: "epub" }}
      />

      {/* Annotation tools */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-2 rl-card px-2 py-1.5 shadow-md" style={{ background: "var(--paper-2)" }}>
        <span className="text-[11px]" style={{ color: marker ? colorMeta(marker).hex : "var(--ink-3)" }} title="Tap a colour, then select text to highlight">
          {marker ? `🖍 ${colorMeta(marker).label} — select text` : "Highlight"}
        </span>
        <ColorSwatches active={marker ?? undefined} onPick={(c) => setMarker((m) => (m === c ? null : c))} size={18} />
        {marker && (
          <button onClick={() => setMarker(null)} className="text-[11px] px-1" style={{ color: "var(--ink-4)" }} title="Put the pen down">✕</button>
        )}
        <div className="w-px h-5" style={{ background: "var(--line)" }} />
        <button onClick={addPageNote} className="rl-btn text-[11px]" title="Add a note to this page">＋ Note</button>
        <button onClick={() => setShowNotes(true)} className="rl-btn text-[11px]" title="My highlights & notes">
          ✎ Notes{myCount > 0 ? ` · ${myCount}` : ""}
        </button>
        <button onClick={() => setShowSheets(true)} className="rl-btn text-[11px]" title="Browse chapters">▦ Chapters</button>
        <div className="w-px h-5" style={{ background: "var(--line)" }} />
        <ListenControls ra={ra} onPlay={startListening} />
      </div>

      {/* Selection palette (centered — iframe selections are hard to anchor to) */}
      {epubSel && (
        <div className="absolute left-1/2 bottom-16 -translate-x-1/2 z-[60] rl-card px-3 py-2 flex items-center gap-2 shadow-lg" style={{ background: "var(--paper-2)" }}>
          <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>Highlight:</span>
          <ColorSwatches onPick={applyEpubHighlight} size={22} />
          <button onClick={() => { setEpubSel(null); selContents.current?.window.getSelection()?.removeAllRanges(); }} className="text-[11px] px-1" style={{ color: "var(--ink-4)" }}>✕</button>
        </div>
      )}

      {showSheets && (
        <SheetsOverview
          items={toc}
          onPick={(href) => { setLocation(href); setShowSheets(false); }}
          onClose={() => setShowSheets(false)}
        />
      )}

      {showNotes && (
        <NotesPanel
          items={items}
          onJump={(a) => { if (a.cfiRange) setLocation(a.cfiRange); setShowNotes(false); }}
          onEdit={(a) => setEditingId(a.id)}
          onClose={() => setShowNotes(false)}
        />
      )}

      {editing && (
        <NoteEditor
          anno={editing}
          onChange={(patch) => update(editing.id, patch)}
          onDelete={() => { remove(editing.id); setEditingId(null); }}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}

// ── Chapter overview: every section as a sheet you can jump to ──
function SheetsOverview({
  items,
  onPick,
  onClose,
}: {
  items: TocItem[];
  onPick: (href: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "color-mix(in oklab, var(--paper) 96%, transparent)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
        <div>
          <div className="rl-serif text-lg leading-tight">Chapters</div>
          <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>
            {items.length} sections · tap one to jump
          </div>
        </div>
        <button onClick={onClose} className="rl-btn text-xs">Close ✕</button>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--ink-3)" }}>
          This book has no chapter markers to jump between.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto rl-scroll p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
            {items.map((it, i) => (
              <button key={`${it.href}-${i}`} onClick={() => onPick(it.href)} className="text-left group" title={it.label}>
                <div className="rl-card aspect-[3/4] p-3 flex flex-col transition group-hover:-translate-y-1 group-hover:shadow-lg" style={{ background: "var(--paper-2)", boxShadow: "0 1px 3px rgba(28,24,20,0.08)" }}>
                  <div className="text-[10px] rl-mono mb-2" style={{ color: "var(--ink-4)" }}>{String(i + 1).padStart(2, "0")}</div>
                  <div className="rl-serif text-[13px] leading-snug line-clamp-4" style={{ paddingLeft: it.depth * 8 }}>{it.label || "Untitled"}</div>
                  <div className="mt-auto space-y-1 pt-2" aria-hidden>
                    <div style={{ height: 2, background: "var(--line)", width: "90%" }} />
                    <div style={{ height: 2, background: "var(--line)", width: "75%" }} />
                    <div style={{ height: 2, background: "var(--line)", width: "85%" }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type TocNavItem = { label?: string; href: string; subitems?: TocNavItem[] };
function flattenToc(toc: TocNavItem[], depth = 0, out: TocItem[] = []): TocItem[] {
  for (const it of toc || []) {
    out.push({ label: (it.label || "").trim(), href: it.href, depth });
    if (it.subitems?.length) flattenToc(it.subitems, depth + 1, out);
  }
  return out;
}
