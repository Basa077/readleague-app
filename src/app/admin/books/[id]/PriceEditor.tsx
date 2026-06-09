"use client";

import { useActionState } from "react";
import { updateBookPriceAction, type PriceState } from "@/app/actions/books";
import type { Book } from "@/db/schema";

const init: PriceState = {};

export function PriceEditor({ book }: { book: Book }) {
  const [state, formAction, pending] = useActionState(updateBookPriceAction, init);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="bookId" value={book.id} />
      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--ink-2)" }}>Price in GHS — set 0 to keep it free</label>
        <input name="priceGhs" type="number" min={0} max={100000} step={1} defaultValue={book.priceGhs ?? 0} className="rl-input" />
      </div>

      {state.error && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ background: "var(--claret-soft)", color: "var(--claret)" }}>{state.error}</div>
      )}
      {state.ok && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>Saved.</div>
      )}

      <button disabled={pending} className="rl-btn rl-btn-primary">{pending ? "Saving…" : "Save price"}</button>
    </form>
  );
}
