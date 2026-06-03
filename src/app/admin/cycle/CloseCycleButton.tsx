"use client";

import { useActionState } from "react";
import { closeCycleAction, type ActionState } from "@/app/actions/admin";

const init: ActionState = {};

export function CloseCycleButton() {
  const [state, formAction, pending] = useActionState(closeCycleAction, init);
  return (
    <form action={formAction} className="space-y-2">
      <button
        disabled={pending}
        className="rl-btn rl-btn-primary"
        onClick={(e) => {
          if (!confirm("Close the weekly cycle for every league?")) e.preventDefault();
        }}
      >
        {pending ? "Closing cycle…" : "Close cycle now"}
      </button>
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
    </form>
  );
}
