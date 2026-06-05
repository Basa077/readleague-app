"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupAction, type AuthState } from "@/app/actions/auth";
import { GoogleButton } from "@/components/GoogleButton";
import { Wordmark } from "@/components/Logo";

const initialState: AuthState = {};

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Contains a letter", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "Contains a number", test: (p: string) => /[0-9]/.test(p) },
];

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(signupAction, initialState);
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="rl-card w-full max-w-md p-8 space-y-6 rl-fadeup">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <Wordmark href="/" size={32} textClassName="text-2xl" />
          </div>
          <div className="text-sm" style={{ color: "var(--ink-3)" }}>Start in the Tuareg League.</div>
        </div>

        {googleEnabled && (
          <>
            <GoogleButton label="Sign up with Google" />
            <div className="flex items-center gap-3" aria-hidden>
              <div className="flex-1 rl-divider" />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>or</span>
              <div className="flex-1 rl-divider" />
            </div>
          </>
        )}

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
            <input
              name="password"
              type="password"
              required
              minLength={8}
              className="rl-input"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ul className="space-y-0.5 pt-0.5">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(password);
                return (
                  <li
                    key={rule.label}
                    className="text-[10px] flex items-center gap-1.5"
                    style={{ color: met ? "var(--success)" : "var(--ink-3)" }}
                  >
                    <span aria-hidden>{met ? "✓" : "○"}</span>
                    {rule.label}
                  </li>
                );
              })}
            </ul>
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
