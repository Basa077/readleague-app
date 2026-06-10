"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { colorMeta, citedClipboardText, type HighlightColorKey } from "@/lib/annotations";
import { useAnnotations, parseRects, type Anno, type NRect } from "./useAnnotations";
import { ColorSwatches, SelectionToolbar, NoteEditor, NotesPanel } from "./AnnotationUI";
import { useReadAloud, toChunks } from "./useReadAloud";
import { ListenControls } from "./ListenControls";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ViewMode = "scroll" | "single";
type Selection = { page: number; rects: NRect[]; text: string; x: number; y: number };

// Turn the current DOM text selection into page-normalized rectangles, if it
// lies entirely within `container`.
function rectsFromSelection(container: HTMLElement): { rects: NRect[]; text: string; anchor: DOMRect } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return null;
  const cb = container.getBoundingClientRect();
  const rects: NRect[] = [];
  for (const r of Array.from(range.getClientRects())) {
    if (r.width < 1 || r.height < 1) continue;
    rects.push({ x: (r.left - cb.left) / cb.width, y: (r.top - cb.top) / cb.height, w: r.width / cb.width, h: r.height / cb.height });
  }
  if (!rects.length) return null;
  return { rects, text: sel.toString(), anchor: range.getBoundingClientRect() };
}

export function PdfReader({
  url,
  initialPage,
  bookId,
  citation,
  onPageChange,
}: {
  url: string;
  initialPage: number;
  bookId: number;
  citation: string;
  onPageChange: (page: number, total?: number) => void;
}) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(Math.max(1, initialPage));
  const [width, setWidth] = useState<number>(800);
  const [mode, setMode] = useState<ViewMode>("scroll");
  const [showGrid, setShowGrid] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Annotations
  const { items, add, update, remove } = useAnnotations(bookId);
  // The "armed" marker pen. null = off → selecting text opens the colour palette.
  // A colour = the pen is held → selecting text highlights instantly in that colour.
  const [marker, setMarker] = useState<HighlightColorKey | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  // How many rendered pages had / lacked selectable text — to spot scanned PDFs.
  const textStat = useRef<Map<number, boolean>>(new Map());
  const [scanned, setScanned] = useState(false);
  const editing = editingId != null ? items.find((a) => a.id === editingId) ?? null : null;
  const myCount = items.filter((a) => a.mine).length;

  const pageEls = useRef<Map<number, HTMLDivElement>>(new Map());
  const ratios = useRef<Map<number, number>>(new Map());
  const observer = useRef<IntersectionObserver | null>(null);
  const didInitialScroll = useRef(false);

  useEffect(() => {
    const measure = () => {
      if (wrapRef.current) setWidth(Math.min(900, Math.max(300, wrapRef.current.clientWidth - 24)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => { onPageChange(pageNumber, numPages); }, [pageNumber, numPages, onPageChange]);

  // Copy → append a citation so passages leave the app already attributed.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onCopy = (e: ClipboardEvent) => {
      const sel = window.getSelection()?.toString() ?? "";
      if (!sel.trim()) return;
      e.clipboardData?.setData("text/plain", citedClipboardText(sel, citation));
      e.preventDefault();
    };
    el.addEventListener("copy", onCopy);
    return () => el.removeEventListener("copy", onCopy);
  }, [citation]);

  // Continuous-scroll: report the most-visible page for progress tracking.
  useEffect(() => {
    if (mode !== "scroll") return;
    const root = wrapRef.current;
    if (!root || !numPages) return;
    ratios.current.clear();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.page);
          ratios.current.set(n, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let best = 0, bestRatio = 0;
        for (const [n, r] of ratios.current) if (r > bestRatio) { bestRatio = r; best = n; }
        if (best && bestRatio > 0) setPageNumber(best);
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    observer.current = io;
    pageEls.current.forEach((el) => io.observe(el));
    return () => { io.disconnect(); observer.current = null; };
  }, [mode, numPages]);

  // Jump to the saved position once the doc is ready.
  useEffect(() => {
    if (mode !== "scroll" || !numPages || didInitialScroll.current) return;
    if (initialPage > 1) {
      const el = pageEls.current.get(Math.min(initialPage, numPages));
      if (el) { el.scrollIntoView({ block: "start" }); didInitialScroll.current = true; }
    } else {
      didInitialScroll.current = true;
    }
  }, [mode, numPages, initialPage]);

  // Keyboard paging in single-page mode.
  useEffect(() => {
    if (mode !== "single") return;
    function onKey(e: KeyboardEvent) {
      if (showGrid || editingId != null) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") setPageNumber((p) => Math.min(numPages || p + 1, p + 1));
      else if (e.key === "ArrowLeft" || e.key === "PageUp") setPageNumber((p) => Math.max(1, p - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [numPages, showGrid, mode, editingId]);

  const registerPage = useCallback((n: number, el: HTMLDivElement | null) => {
    if (el) { pageEls.current.set(n, el); observer.current?.observe(el); }
    else { const prev = pageEls.current.get(n); if (prev) observer.current?.unobserve(prev); pageEls.current.delete(n); }
  }, []);

  const jump = useCallback((p: number) => {
    const target = Math.max(1, Math.min(numPages || p, p));
    setShowGrid(false);
    setPageNumber(target);
    if (mode === "scroll") requestAnimationFrame(() => pageEls.current.get(target)?.scrollIntoView({ block: "start", behavior: "smooth" }));
    else wrapRef.current?.scrollTo({ top: 0 });
  }, [numPages, mode]);

  // Core: persist a highlight from already-computed rects.
  const createHighlight = useCallback(
    async (page: number, rects: NRect[], text: string, color: HighlightColorKey, openEditor: boolean) => {
      window.getSelection()?.removeAllRanges();
      const created = await add({ kind: "highlight", color, page, rects: JSON.stringify(rects), selectedText: text });
      if (created && openEditor) setEditingId(created.id);
    },
    [add]
  );

  const onPageSelect = useCallback((page: number, wrapperEl: HTMLElement) => {
    const r = rectsFromSelection(wrapperEl);
    if (!r) { setSelection(null); return; }
    if (marker) {
      // Pen is held → mark instantly and stay armed for the next selection.
      void createHighlight(page, r.rects, r.text, marker, false);
      return;
    }
    // Clamp the palette into the viewport so it's never off-screen.
    const x = Math.min(window.innerWidth - 120, Math.max(120, r.anchor.left + r.anchor.width / 2));
    const y = Math.max(72, r.anchor.top);
    setSelection({ page, rects: r.rects, text: r.text, x, y });
  }, [marker, createHighlight]);

  const applyHighlight = useCallback(async (color: HighlightColorKey) => {
    const s = selection;
    if (!s) return;
    setSelection(null);
    await createHighlight(s.page, s.rects, s.text, color, true);
  }, [selection, createHighlight]);

  // Record whether a rendered page had selectable text; flag whole-doc scans.
  const reportText = useCallback((page: number, hasText: boolean) => {
    textStat.current.set(page, hasText);
    const vals = Array.from(textStat.current.values());
    if (vals.length >= 3 && vals.every((v) => !v)) setScanned(true);
    else if (hasText) setScanned(false);
  }, []);

  const addPageNote = useCallback(async () => {
    const created = await add({ kind: "note", color: marker ?? "yellow", page: pageNumber });
    if (created) setEditingId(created.id);
  }, [add, marker, pageNumber]);

  // ── Read-aloud: speak the current page, then advance and keep going. ──
  const ra = useReadAloud();
  const listenPageRef = useRef(1);
  const pageText = useCallback((p: number) => {
    const layer = pageEls.current.get(p)?.querySelector(".react-pdf__Page__textContent, .textLayer");
    return layer ? Array.from(layer.querySelectorAll("span")).map((s) => s.textContent ?? "").join(" ") : "";
  }, []);
  const startListening = useCallback(() => {
    listenPageRef.current = pageNumber;
    ra.play({
      chunks: () => toChunks(pageText(listenPageRef.current)),
      advance: async () => {
        const total = numPages || listenPageRef.current;
        if (listenPageRef.current >= total) return false;
        listenPageRef.current += 1;
        jump(listenPageRef.current);
        await new Promise((r) => setTimeout(r, 750));
        return true;
      },
    });
  }, [pageNumber, numPages, jump, pageText, ra]);

  const pageList = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="h-full w-full relative">
      <div ref={wrapRef} className="h-full w-full overflow-auto flex flex-col items-center bg-[var(--paper-3)] rl-scroll">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="p-8 text-sm" style={{ color: "var(--ink-3)" }}>Loading book…</div>}
          error={<div className="p-8 text-sm" style={{ color: "var(--danger)" }}>Could not load this book file.</div>}
          className="w-full flex flex-col items-center"
        >
          {showGrid ? (
            <div className="w-full p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-w-5xl mx-auto">
                {pageList.map((n) => <PageThumb key={n} pageNumber={n} current={pageNumber} onPick={jump} />)}
              </div>
            </div>
          ) : mode === "scroll" ? (
            <div className="w-full flex flex-col items-center gap-3 py-4">
              {pageList.map((n) => (
                <PdfPage key={n} pageNumber={n} width={width} annos={items} register={registerPage} onSelect={onPageSelect} onText={reportText} eager={n <= 2} />
              ))}
            </div>
          ) : (
            <div className="py-4">
              <PdfPage pageNumber={pageNumber} width={width} annos={items} register={registerPage} onSelect={onPageSelect} onText={reportText} eager />
            </div>
          )}
        </Document>
      </div>

      {/* Annotation tools (marker pen + notes) */}
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
      </div>

      {/* Scanned / image-only PDF: explain why text can't be selected. */}
      {scanned && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 rl-card px-3 py-1.5 text-[11px] shadow-md text-center max-w-[92%]" style={{ background: "var(--paper-2)", color: "var(--ink-2)" }}>
          🖼 This PDF is made of page images (scanned) — there’s no selectable text, so highlighting &amp; notes aren’t available for it.
        </div>
      )}

      {/* Navigation bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 sm:gap-3 py-2 px-3 backdrop-blur z-20" style={{ background: "color-mix(in oklab, var(--paper-2) 90%, transparent)", borderTop: "0.5px solid var(--line)" }}>
        <button onClick={() => setMode((m) => (m === "scroll" ? "single" : "scroll"))} className="rl-btn text-xs" title={mode === "scroll" ? "One page at a time" : "Scroll through all pages"}>
          {mode === "scroll" ? "▤ One page" : "▦ Scroll"}
        </button>
        <div className="w-px h-5" style={{ background: "var(--line)" }} />
        <button onClick={() => setShowGrid((s) => !s)} className={`rl-btn text-xs ${showGrid ? "rl-btn-primary" : ""}`} title="Browse pages as thumbnails">▦ Pages</button>
        <div className="w-px h-5" style={{ background: "var(--line)" }} />
        <ListenControls ra={ra} onPlay={startListening} />
        {mode === "single" && !showGrid && (
          <>
            <div className="w-px h-5" style={{ background: "var(--line)" }} />
            <button onClick={() => setPageNumber((p) => Math.max(1, p - 1))} disabled={pageNumber <= 1} className="rl-btn text-xs">← Prev</button>
          </>
        )}
        <div className="rl-mono text-xs" style={{ color: "var(--ink-3)" }}>{pageNumber} / {numPages || "?"}</div>
        {mode === "single" && !showGrid && (
          <button onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p + 1))} disabled={!!numPages && pageNumber >= numPages} className="rl-btn text-xs">Next →</button>
        )}
      </div>

      {selection && (
        <SelectionToolbar x={selection.x} y={selection.y} onPick={applyHighlight} onCancel={() => { setSelection(null); window.getSelection()?.removeAllRanges(); }} />
      )}

      {showNotes && (
        <NotesPanel
          items={items}
          onJump={(a) => { if (a.page) jump(a.page); setShowNotes(false); }}
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

// A readable page with highlight overlays and selection capture.
function PdfPage({
  pageNumber,
  width,
  annos,
  register,
  onSelect,
  onText,
  eager = false,
}: {
  pageNumber: number;
  width: number;
  annos: Anno[];
  register: (n: number, el: HTMLDivElement | null) => void;
  onSelect: (page: number, wrapperEl: HTMLElement) => void;
  onText: (page: number, hasText: boolean) => void;
  eager?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [render, setRender] = useState(eager);
  const [noText, setNoText] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) register(pageNumber, el);
    return () => register(pageNumber, null);
  }, [pageNumber, register]);

  useEffect(() => {
    if (render) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRender(true); io.disconnect(); } }, { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [render]);

  const highlights = annos.filter((a) => a.kind === "highlight" && a.page === pageNumber);

  return (
    <div
      ref={ref}
      data-page={pageNumber}
      className="relative shadow-sm"
      style={{ width, minHeight: render ? undefined : Math.round(width * 1.3), background: "#fff" }}
      onMouseUp={() => { if (ref.current) onSelect(pageNumber, ref.current); }}
      onTouchEnd={() => { if (ref.current) onSelect(pageNumber, ref.current); }}
    >
      {render ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          renderAnnotationLayer
          renderTextLayer
          loading={<div style={{ height: Math.round(width * 1.3) }} />}
          onRenderTextLayerSuccess={() => {
            const layer = ref.current?.querySelector(".react-pdf__Page__textContent, .textLayer");
            const hasText = !!layer && Array.from(layer.querySelectorAll("span")).some((s) => (s.textContent || "").trim().length > 0);
            setNoText(!hasText);
            onText(pageNumber, hasText);
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--ink-4)" }}>
          <span className="rl-mono text-xs">{pageNumber}</span>
        </div>
      )}

      {/* Highlight overlays — drawn over the page, never capturing pointer events
          so text stays selectable for making new highlights. */}
      {highlights.map((a) =>
        parseRects(a.rects).map((r, i) => (
          <div
            key={`${a.id}-${i}`}
            className="absolute pointer-events-none"
            style={{
              left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%`,
              background: colorMeta(a.color).soft, mixBlendMode: "multiply", borderRadius: 2,
            }}
          />
        ))
      )}

      {render && noText && (
        <div className="absolute top-2 left-2 rl-mono text-[10px] px-1.5 py-0.5 rounded pointer-events-none" style={{ background: "color-mix(in oklab, var(--paper) 80%, transparent)", color: "var(--ink-4)" }}>
          🖼 image — no text to highlight
        </div>
      )}

      <div className="absolute bottom-1 right-2 rl-mono text-[10px] px-1.5 rounded pointer-events-none" style={{ background: "color-mix(in oklab, var(--paper) 70%, transparent)", color: "var(--ink-4)" }}>
        {pageNumber}
      </div>
    </div>
  );
}

// Lazy thumbnail for the "browse all pages" grid.
function PageThumb({ pageNumber, current, onPick }: { pageNumber: number; current: number; onPick: (p: number) => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: "500px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const isCurrent = pageNumber === current;
  const placeholder = (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--paper)", color: "var(--ink-4)" }}>
      <span className="rl-mono text-xs">{pageNumber}</span>
    </div>
  );

  return (
    <button ref={ref} onClick={() => onPick(pageNumber)} className="group block" title={`Page ${pageNumber}`}>
      <div className="rl-card overflow-hidden flex items-center justify-center transition group-hover:-translate-y-1" style={{ aspectRatio: "3 / 4", background: "#fff", outline: isCurrent ? "2px solid var(--accent)" : "none", outlineOffset: -2 }}>
        {visible ? <Page pageNumber={pageNumber} width={170} renderAnnotationLayer={false} renderTextLayer={false} loading={placeholder} /> : placeholder}
      </div>
      <div className="text-[10px] text-center mt-1 rl-mono" style={{ color: isCurrent ? "var(--accent-ink)" : "var(--ink-3)" }}>{pageNumber}</div>
    </button>
  );
}
