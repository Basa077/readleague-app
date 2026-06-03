"use client";

import { useActionState, useState } from "react";
import { updateBookLockAction, type LockState } from "@/app/actions/books";
import type { Book } from "@/db/schema";

const init: LockState = {};

export function LockEditor({ book, leagues }: { book: Book; leagues: string[] }) {
  const [state, formAction, pending] = useActionState(updateBookLockAction, init);
  const [lockType, setLockType] = useState(book.lockType);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="bookId" value={book.id} />

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs" style={{ color: "var(--ink-2)" }}>Lock type</label>
          <select name="lockType" value={lockType} onChange={(e) => setLockType(e.target.value as Book["lockType"])} className="rl-input">
            <option value="open">Open — anyone can read</option>
            <option value="league_winner">Reward — league winner only</option>
            <option value="league_top_n">Reward — top N of a league</option>
            <option value="admin_grant">Locked — coordinator grants only</option>
          </select>
        </div>

        {(lockType === "league_winner" || lockType === "league_top_n") && (
          <div className="space-y-1">
            <label className="text-xs" style={{ color: "var(--ink-2)" }}>Which league?</label>
            <select name="lockLeagueId" defaultValue={book.lockLeagueId ?? "asante"} className="rl-input">
              {leagues.map((l) => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)} League</option>
              ))}
            </select>
          </div>
        )}

        {lockType === "league_top_n" && (
          <div className="space-y-1">
            <label className="text-xs" style={{ color: "var(--ink-2)" }}>Top N</label>
            <input name="lockPosition" type="number" min={1} max={20} defaultValue={book.lockPosition ?? 4} className="rl-input" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--ink-2)" }}>Note shown to readers (optional)</label>
        <input name="lockNote" defaultValue={book.lockNote ?? ""} maxLength={200} className="rl-input" placeholder="e.g. End-of-season reward" />
      </div>

      {state.error && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ background: "var(--claret-soft)", color: "var(--claret)" }}>
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
          Saved.
        </div>
      )}

      <button disabled={pending} className="rl-btn rl-btn-primary">{pending ? "Saving…" : "Save lock"}</button>
    </form>
  );
}
