"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "rl-tour-v1";

type Step = {
  selector?: string; // element to spotlight; omit for a centered card
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    title: "Welcome to ReadLeague 👋",
    body: "A quick 30-second tour of how things work. You can skip any time — let's take a look around.",
  },
  {
    selector: '[data-tour="search"]',
    title: "Find any book",
    body: "Search the library here. If we don't have a title yet, you can ask us to fetch a free public-domain copy — it's added and ready to read in seconds.",
  },
  {
    selector: '[data-tour="nav-library"]',
    title: "Your library",
    body: "Everything you're reading and have finished lives here, with your place saved automatically.",
  },
  {
    selector: '[data-tour="nav-add"]',
    title: "Add a book",
    body: "Share a PDF or EPUB with your league. Approved uploads earn you bonus points and promotion tickets.",
  },
  {
    selector: '[data-tour="nav-leagues"]',
    title: "Climb the leagues",
    body: "Earn points by reading, get promoted from Tuareg up to Asante, and unlock reward books only champions can read.",
  },
  {
    selector: '[data-tour="nav-profile"]',
    title: "Track your progress",
    body: "Your points, streak, badges and reading history — all in one place.",
  },
  {
    title: "You're all set 🎉",
    body: "Read more, climb higher. You can replay this tour any time from your profile.",
  },
];

function visibleEl(selector: string): HTMLElement | null {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  // The hidden nav (mobile vs desktop) collapses to zero size, so the one with
  // real dimensions is the visible one.
  return els.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? els[0] ?? null;
}

type Rect = { top: number; left: number; width: number; height: number } | null;

export function Tour() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect>(null);

  // Start automatically on the reader's first visit to Discover.
  useEffect(() => {
    if (pathname !== "/app") return;
    let done = false;
    try {
      done = localStorage.getItem(STORAGE_KEY) === "done";
    } catch {}
    if (!done) {
      // small delay so the page has painted before we measure
      const t = setTimeout(() => { setI(0); setActive(true); }, 600);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  // Allow replaying from elsewhere (e.g. a "Take the tour" button).
  useEffect(() => {
    const onStart = () => { setI(0); setActive(true); };
    window.addEventListener("rl:tour", onStart);
    return () => window.removeEventListener("rl:tour", onStart);
  }, []);

  const step = STEPS[i];

  const measure = useCallback(() => {
    if (!step?.selector) { setRect(null); return; }
    const el = visibleEl(step.selector);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", inline: "center" });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => {
    if (!active) return;
    measure();
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [active, measure]);

  if (!active) return null;

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, "done"); } catch {}
    setActive(false);
  };
  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : finish());
  const back = () => setI(Math.max(0, i - 1));

  const pad = 8;
  const spotlight = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // Card placement: below the spotlight if there's room, else above; centered when no target.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const cardW = Math.min(340, vw - 24);
  const cardH = 210;
  let cardTop = vh / 2 - cardH / 2;
  let cardLeft = vw / 2 - cardW / 2;
  if (spotlight) {
    const below = spotlight.top + spotlight.height + 14;
    const above = spotlight.top - cardH - 14;
    cardTop = below + cardH < vh ? below : Math.max(12, above);
    cardLeft = Math.min(Math.max(12, spotlight.left + spotlight.width / 2 - cardW / 2), vw - cardW - 12);
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* Dim + spotlight cutout */}
      {spotlight ? (
        <div
          style={{
            position: "absolute",
            top: spotlight.top, left: spotlight.left,
            width: spotlight.width, height: spotlight.height,
            borderRadius: 12,
            boxShadow: "0 0 0 9999px rgba(20,16,12,0.66)",
            transition: "all 220ms cubic-bezier(0.22,1,0.36,1)",
            pointerEvents: "none",
          }}
        />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "rgba(20,16,12,0.66)" }} />
      )}

      {/* Click-catcher so the tour stays in focus */}
      <div style={{ position: "absolute", inset: 0 }} onClick={(e) => e.stopPropagation()} />

      {/* Tooltip card */}
      <div
        className="rl-card rl-fadeup"
        style={{
          position: "absolute", top: cardTop, left: cardLeft, width: cardW,
          padding: 18, background: "var(--paper-2)",
          boxShadow: "0 18px 50px -12px rgba(20,16,12,0.5)",
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] uppercase tracking-wider rl-mono" style={{ color: "var(--ink-3)" }}>
            {i + 1} / {STEPS.length}
          </span>
          <button onClick={finish} className="text-[11px]" style={{ color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer" }}>
            Skip tour
          </button>
        </div>
        <div className="rl-serif text-lg mb-1.5">{step.title}</div>
        <p className="text-sm mb-4" style={{ color: "var(--ink-2)", lineHeight: 1.5 }}>{step.body}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, idx) => (
              <span key={idx} style={{
                width: 6, height: 6, borderRadius: 999,
                background: idx === i ? "var(--accent)" : "var(--line)",
                display: "inline-block",
              }} />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && <button onClick={back} className="rl-btn text-xs px-3 py-1.5">Back</button>}
            <button onClick={next} className="rl-btn rl-btn-primary text-xs px-3 py-1.5">
              {i < STEPS.length - 1 ? "Next" : "Start reading"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Dispatch from anywhere (e.g. a profile button) to replay the tour. */
export function startTour() {
  window.dispatchEvent(new Event("rl:tour"));
}
