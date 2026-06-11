"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const QUICK = [
  { label: "Explain this", q: "Explain the passage I have selected in simple terms." },
  { label: "Summarise so far", q: "Give me a short summary of what's happened up to where I am." },
  { label: "Define a word", q: "Define a difficult word from the passage I selected and use it in a sentence." },
  { label: "Quiz me", q: "Ask me one thoughtful question to check my understanding so far." },
];

/** Lia — the in-reader AI reading companion. Streams answers from /api/assistant. */
export function AssistantPanel({
  bookId,
  bookTitle,
  getExcerpt,
  getPage,
  onClose,
}: {
  bookId: number;
  bookTitle: string;
  getExcerpt: () => string;
  getPage: () => number;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    const excerpt = getExcerpt();
    const history = messages.slice(-8);
    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, question: q, excerpt, page: getPage(), history }),
      });
      if (!res.ok || !res.body) {
        const text = (await res.text().catch(() => "")) || "The assistant isn't available right now.";
        setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: text }; return c; });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: acc }; return c; });
      }
    } catch {
      setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: "Sorry — I couldn't reach the assistant. Check your connection and try again." }; return c; });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="absolute inset-0 z-[58] flex" onClick={onClose}>
      <div className="flex-1" style={{ background: "rgba(20,16,12,0.25)" }} />
      <aside
        className="w-full max-w-md h-full flex flex-col"
        style={{ background: "var(--paper)", borderLeft: "0.5px solid var(--line)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <div>
              <div className="rl-serif text-base leading-tight">Lia · reading companion</div>
              <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>Ask anything about {bookTitle}</div>
            </div>
          </div>
          <button onClick={onClose} className="rl-btn text-xs">Close ✕</button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto rl-scroll p-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-[13px] leading-relaxed" style={{ color: "var(--ink-2)" }}>
              Hi! I’m <strong>Lia</strong>. Select a passage and ask me to explain it, or try one of these:
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className="max-w-[88%] rounded-lg px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap"
                style={
                  m.role === "user"
                    ? { background: "var(--accent)", color: "var(--paper)" }
                    : { background: "var(--paper-2)", color: "var(--ink)", border: "0.5px solid var(--line)" }
                }
              >
                {m.content || (busy ? "…" : "")}
              </div>
            </div>
          ))}
        </div>

        <div className="px-3 pt-2 flex flex-wrap gap-1.5">
          {QUICK.map((qa) => (
            <button key={qa.label} onClick={() => ask(qa.q)} disabled={busy} className="rl-pill text-[11px]" style={{ opacity: busy ? 0.5 : 1 }}>
              {qa.label}
            </button>
          ))}
        </div>

        <form
          className="p-3 flex items-end gap-2"
          onSubmit={(e) => { e.preventDefault(); ask(input); }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
            placeholder="Ask about this book…"
            rows={1}
            className="flex-1 rounded-md p-2 text-sm resize-none"
            style={{ background: "var(--paper-2)", border: "0.5px solid var(--line)", color: "var(--ink)", maxHeight: 120 }}
          />
          <button type="submit" disabled={busy || !input.trim()} className="rl-btn rl-btn-primary text-xs shrink-0">
            {busy ? "…" : "Ask"}
          </button>
        </form>
      </aside>
    </div>
  );
}
