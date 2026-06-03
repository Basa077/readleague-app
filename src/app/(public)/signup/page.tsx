"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type AuthState } from "@/app/actions/auth";

const initialState: AuthState = {};

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="rl-card w-full max-w-md p-8 space-y-6 rl-fadeup">
        <div className="space-y-1 text-center">
          <Link href="/" className="rl-serif text-2xl">ReadLeague</Link>
          <div className="text-sm" style={{ color: "var(--ink-3)" }}>Start in the Tuareg League.</div>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: "var(--ink-2)" }}>Display name</label>
            <input name="displayName" required minLength={2} className="rl-input" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: "var(--ink-2)" }}>Handle</label>
            <input name="handle" required minLength={3} className="rl-input" placeholder="kojo.reads" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: "var(--ink-2)" }}>Email</label>
            <input name="email" type="email" required className="rl-input" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: "var(--ink-2)" }}>Password</label>
            <input name="password" type="password" required minLength={8} className="rl-input" autoComplete="new-password" />
            <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>At least 8 characters.</div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: "var(--ink-2)" }}>Role</label>
            <select name="role" className="rl-input" defaultValue="reader">
              <option value="reader">Reader</option>
              <option value="coordinator">Coordinator (admin)</option>
            </select>
          </div>

          {state.error && (
            <div className="text-xs px-3 py-2 rounded-md" style={{ background: "var(--claret-soft)", color: "var(--claret)" }}>
              {state.error}
            </div>
          )}

          <button type="submit" disabled={pending} className="rl-btn rl-btn-primary w-full">
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <div className="text-xs text-center" style={{ color: "var(--ink-3)" }}>
          Have an account? <Link href="/login" style={{ color: "var(--accent-ink)" }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
