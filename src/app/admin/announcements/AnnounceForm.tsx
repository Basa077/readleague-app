"use client";

import { useActionState, useEffect, useRef } from "react";
import { announceAction, type ActionState } from "@/app/actions/admin";

const init: ActionState = {};

export function AnnounceForm() {
  const [state, formAction, pending] = useActionState(announceAction, init);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={formAction} className="rl-card p-4 space-y-3">
      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--ink-2)" }}>Title</label>
        <input name="title" required maxLength={120} className="rl-input" />
      </div>
      <div className="space-y-1">
        <label className="text-xs" style={{ color: "var(--ink-2)" }}>Body</label>
        <textarea name="body" required rows={3} maxLength={2000} className="rl-input" />
      </div>
      {state.error && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ background: "var(--claret-soft)", color: "var(--claret)" }}>
          {state.error}
        </div>
      )}
      {state.message && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
          {state.message}
        </div>
      )}
      <button disabled={pending} className="rl-btn rl-btn-primary">{pending ? "Posting…" : "Post announcement"}</button>
    </form>
  );
}
