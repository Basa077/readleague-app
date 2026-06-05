"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestBookAction, type RequestBookState } from "@/app/actions/request-book";

const init: RequestBookState = {};

/**
 * Shown when a search returns nothing. Lets the reader ask us to fetch the book
 * from the free public-domain libraries and add it to the catalogue on the spot.
 */
export function RequestBook({ query }: { query: string }) {
  const [state, formAction, pending] = useActionState(requestBookAction, init);

  if (state.ok && state.bookId) {
    return (
      <div className="rl-card p-8 text-center space-y-3 rl-fadeup">
        <div className="text-2xl" aria-hidden>📖</div>
        <div className="rl-serif text-xl">
          {state.existing ? "It's already in the library" : `Added “${state.title}”`}
        </div>
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {state.existing
            ? "Good news — we already had a copy. Jump straight in."
            : "We found a free copy and added it to ReadLeague. It's ready to read now."}
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          <Link href={`/app/read/${state.bookId}`} className="rl-btn rl-btn-primary">
            Read now
          </Link>
          <Link href={`/app/books/${state.bookId}`} className="rl-btn">
            Details
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rl-card p-8 text-center space-y-3">
      <div className="rl-serif text-xl">No match for “{query}”</div>
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        We don&apos;t have that one yet. We can look for a free public-domain copy
        and add it to the library for you.
      </p>

      {state.error && (
        <div
          className="text-xs px-3 py-2 rounded-md inline-block text-left max-w-sm"
          style={{ background: "var(--amber-soft)", color: "var(--ink-2)" }}
        >
          {state.error}
        </div>
      )}

      <form action={formAction} className="pt-1">
        <input type="hidden" name="q" value={query} />
        <button type="submit" disabled={pending} className="rl-btn rl-btn-primary">
          {pending ? "Searching free libraries…" : `Find & add “${query}”`}
        </button>
      </form>

      <div className="pt-1">
        <Link href="/app" className="text-xs" style={{ color: "var(--accent-ink)" }}>
          or browse the library →
        </Link>
      </div>
    </div>
  );
}
