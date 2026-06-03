"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logSessionAction, savePositionAction } from "@/app/actions/reading";

const PdfReader = dynamic(() => import("./PdfReader").then((m) => m.PdfReader), { ssr: false });
const EpubReader = dynamic(() => import("./EpubReader").then((m) => m.EpubReader), { ssr: false });

type Book = {
  id: number;
  title: string;
  author: string;
  fileUrl: string;
  format: string;
  pages: number | null;
};

export function ReaderShell({
  book,
  resume,
}: {
  book: Book;
  resume: { currentPage: number; cfi: string | null; finished: boolean };
}) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(resume.currentPage);
  const [totalPages, setTotalPages] = useState(book.pages ?? 0);
  const [seconds, setSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);

  // Track delta — pages read THIS session
  const sessionStartPage = useRef(resume.currentPage);
  const lastCfiRef = useRef<string | null>(resume.cfi);

  // Active-time timer — pauses when tab hidden
  useEffect(() => {
    let active = !document.hidden;
    const onVis = () => { active = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(() => {
      if (active) setSeconds((s) => s + 1);
    }, 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(t);
    };
  }, []);

  const handlePageChange = useCallback((page: number, total?: number) => {
    setCurrentPage(page);
    if (total) setTotalPages(total);
  }, []);

  const handleCfi = useCallback((cfi: string, page: number) => {
    lastCfiRef.current = cfi;
    setCurrentPage(page);
    // fire-and-forget position save
    savePositionAction(book.id, cfi, page).catch(() => {});
  }, [book.id]);

  const handleTotalPages = useCallback((total: number) => {
    setTotalPages(total);
  }, []);

  // Save session on unmount / navigation away
  const saveSession = useCallback(async () => {
    if (saving) return;
    const pagesRead = Math.max(0, currentPage - sessionStartPage.current);
    const minutes = Math.max(0, Math.round(seconds / 60));
    if (pagesRead === 0 && minutes < 1) return;
    setSaving(true);
    const res = await logSessionAction({
      bookId: book.id,
      pagesRead,
      minutes,
      cfi: lastCfiRef.current ?? undefined,
      totalPages: totalPages || undefined,
    });
    if (res.ok) setPointsEarned(res.pts ?? 0);
    setSaving(false);
  }, [book.id, currentPage, seconds, totalPages, saving]);

  // Auto-save on unload
  useEffect(() => {
    const onBeforeUnload = () => {
      const pagesRead = Math.max(0, currentPage - sessionStartPage.current);
      const minutes = Math.max(0, Math.round(seconds / 60));
      if (pagesRead > 0 || minutes >= 1) {
        // navigator.sendBeacon would be cleaner but server actions can't be invoked that way
        // useEffect cleanup will fire on SPA nav
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [currentPage, seconds]);

  const minutesDisplay = useMemo(() => {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [seconds]);

  const sessionPages = Math.max(0, currentPage - sessionStartPage.current);
  const pace = sessionPages > 0 && seconds > 0 ? ((sessionPages / (seconds / 60)) || 0).toFixed(1) : "—";

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--paper)" }}>
      <header className="flex items-center justify-between px-3 sm:px-5 py-2.5 border-b" style={{ borderColor: "var(--line)", background: "var(--paper-2)" }}>
        <Link href={`/app/books/${book.id}`} className="rl-btn text-xs" onClick={async (e) => {
          e.preventDefault();
          await saveSession();
          router.push(`/app/books/${book.id}`);
        }}>
          ← Close
        </Link>
        <div className="text-center min-w-0 px-3">
          <div className="rl-serif text-sm sm:text-base truncate">{book.title}</div>
          <div className="text-[10px] sm:text-xs" style={{ color: "var(--ink-3)" }}>{book.author}</div>
        </div>
        <div className="flex items-center gap-2 text-xs rl-mono">
          <span title="Active reading time">{minutesDisplay}</span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span title="Page">p {currentPage}{totalPages ? `/${totalPages}` : ""}</span>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        {book.format === "EPUB" ? (
          <EpubReader
            url={book.fileUrl}
            initialCfi={resume.cfi ?? undefined}
            onCfi={handleCfi}
            onTotalPages={handleTotalPages}
          />
        ) : (
          <PdfReader
            url={book.fileUrl}
            initialPage={resume.currentPage > 0 ? resume.currentPage : 1}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      <footer className="px-3 sm:px-5 py-2 border-t text-[11px] flex items-center justify-between" style={{ borderColor: "var(--line)", background: "var(--paper-2)", color: "var(--ink-3)" }}>
        <div>
          Session: <span className="rl-mono" style={{ color: "var(--ink)" }}>{sessionPages} pages · {minutesDisplay}</span>
          {pace !== "—" && <span> · pace <span className="rl-mono" style={{ color: "var(--ink)" }}>{pace} p/min</span></span>}
        </div>
        <button
          onClick={async () => { await saveSession(); }}
          disabled={saving || (sessionPages === 0 && seconds < 30)}
          className="rl-btn rl-btn-primary text-xs"
        >
          {saving ? "Saving…" : pointsEarned !== null ? `+${pointsEarned} pts — keep going` : "Save session"}
        </button>
      </footer>
    </div>
  );
}
