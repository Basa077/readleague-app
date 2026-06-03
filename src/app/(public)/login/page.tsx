"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/app/actions/auth";

const initialState: AuthState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="rl-card w-full max-w-md p-8 space-y-6 rl-fadeup">
        <div className="space-y-1 text-center">
          <Link href="/" className="rl-serif text-2xl">ReadLeague</Link>
          <div className="text-sm" style={{ color: "var(--ink-3)" }}>Welcome back.</div>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: "var(--ink-2)" }}>Email</label>
            <input name="email" type="email" required className="rl-input" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: "var(--ink-2)" }}>Password</label>
            <input name="password" type="password" required className="rl-input" autoComplete="current-password" />
          </div>

          {state.error && (
            <div className="text-xs px-3 py-2 rounded-md" style={{ background: "var(--claret-soft)", color: "var(--claret)" }}>
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} className="rl-btn rl-btn-primary w-full">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="text-xs text-center" style={{ color: "var(--ink-3)" }}>
          New here? <Link href="/signup" style={{ color: "var(--accent-ink)" }}>Create an account</Link>
        </div>
      </div>
    </div>
  );
}
