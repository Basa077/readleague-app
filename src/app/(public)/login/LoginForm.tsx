"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "@/app/actions/auth";
import { GoogleButton } from "@/components/GoogleButton";
import { Wordmark } from "@/components/Logo";

const initialState: AuthState = {};

const OAUTH_ERRORS: Record<string, string> = {
  google_unconfigured: "Google sign-in isn't set up yet — use email & password for now.",
  google_denied: "Google sign-in was cancelled.",
  google_state: "Google sign-in expired — please try again.",
  google_failed: "Couldn't complete Google sign-in. Please try again.",
};

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) setOauthError(OAUTH_ERRORS[code] ?? "Sign-in failed. Please try again.");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="rl-card w-full max-w-md p-8 space-y-6 rl-fadeup">
        <div className="space-y-2 text-center">
          <div className="flex justify-center">
            <Wordmark href="/" size={32} textClassName="text-2xl" />
          </div>
          <div className="text-sm" style={{ color: "var(--ink-3)" }}>Welcome back.</div>
        </div>

        {oauthError && (
          <div className="text-xs px-3 py-2 rounded-md" style={{ background: "var(--amber-soft)", color: "var(--ink-2)" }}>
            {oauthError}
          </div>
        )}

        {googleEnabled && (
          <>
            <GoogleButton />
            <div className="flex items-center gap-3" aria-hidden>
              <div className="flex-1 rl-divider" />
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>or</span>
              <div className="flex-1 rl-divider" />
            </div>
          </>
        )}

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: "var(--ink-2)" }}>Email</label>
            <input name="email" type="email" required className="rl-input" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs" style={{ color: "var(--ink-2)" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                name="password"
                type={showPw ? "text" : "password"}
                required
                className="rl-input"
                autoComplete="current-password"
                style={{ paddingRight: 60 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="text-[11px]"
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", cursor: "pointer", color: "var(--accent-ink)",
                }}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
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
