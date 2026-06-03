"use client";

import { useActionState } from "react";
import { grantUnlockAction, type ActionState } from "@/app/actions/admin";

const init: ActionState = {};

export function GrantUnlockForm({
  bookId,
  readers,
}: {
  bookId: number;
  readers: { id: number; displayName: string; handle: string }[];
}) {
  const [state, formAction, pending] = useActionState(grantUnlockAction, init);

  return (
    <form action={formAction} className="grid sm:grid-cols-3 gap-3 items-end">
      <input type="hidden" name="bookId" value={bookId} />
      <div className="space-y-1 sm:col-span-1">
        <label className="text-xs" style={{ color: "var(--ink-2)" }}>Reader</label>
        <select name="userId" required className="rl-input">
          <option value="">— Pick a reader —</option>
          {readers.map((r) => (
            <option key={r.id} value={r.id}>{r.displayName} (@{r.handle})</option>
          ))}
        </select>
      </div>
      <div className="space-y-1 sm:col-span-1">
        <label className="text-xs" style={{ color: "var(--ink-2)" }}>Reason</label>
        <input name="reason" maxLength={140} className="rl-input" placeholder="Granted by coordinator" />
      </div>
      <div>
        <button disabled={pending} className="rl-btn rl-btn-primary w-full">{pending ? "Granting…" : "Grant access"}</button>
      </div>
      {state.error && (
        <div className="text-xs px-3 py-2 rounded-md sm:col-span-3" style={{ background: "var(--claret-soft)", color: "var(--claret)" }}>
          {state.error}
        </div>
      )}
      {state.ok && (
        <div className="text-xs px-3 py-2 rounded-md sm:col-span-3" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
          Access granted.
        </div>
      )}
    </form>
  );
}
