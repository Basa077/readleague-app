"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfReader({
  url,
  initialPage,
  onPageChange,
}: {
  url: string;
  initialPage: number;
  onPageChange: (page: number, total?: number) => void;
}) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(Math.max(1, initialPage));
  const [width, setWidth] = useState<number>(800);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const measure = () => {
      if (wrapRef.current) {
        const w = wrapRef.current.clientWidth;
        setWidth(Math.min(900, Math.max(300, w - 24)));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    onPageChange(pageNumber, numPages);
  }, [pageNumber, numPages, onPageChange]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        setPageNumber((p) => Math.min(numPages || p + 1, p + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        setPageNumber((p) => Math.max(1, p - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [numPages]);

  return (
    <div ref={wrapRef} className="h-full w-full overflow-auto flex flex-col items-center bg-[var(--paper-3)]">
      <div className="py-4">
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="p-8 text-sm" style={{ color: "var(--ink-3)" }}>Loading book…</div>}
          error={<div className="p-8 text-sm" style={{ color: "var(--danger)" }}>Could not load this book file.</div>}
        >
          <Page
            pageNumber={pageNumber}
            width={width}
            renderAnnotationLayer
            renderTextLayer
          />
        </Document>
      </div>
      <div className="sticky bottom-0 w-full flex items-center justify-center gap-3 py-2 px-3 backdrop-blur" style={{ background: "color-mix(in oklab, var(--paper-2) 90%, transparent)", borderTop: "0.5px solid var(--line)" }}>
        <button
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          disabled={pageNumber <= 1}
          className="rl-btn text-xs"
        >
          ← Prev
        </button>
        <div className="rl-mono text-xs" style={{ color: "var(--ink-3)" }}>
          {pageNumber} / {numPages || "?"}
        </div>
        <button
          onClick={() => setPageNumber((p) => (numPages ? Math.min(numPages, p + 1) : p + 1))}
          disabled={!!numPages && pageNumber >= numPages}
          className="rl-btn text-xs"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
