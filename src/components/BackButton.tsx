"use client";

import { useRouter } from "next/navigation";

/**
 * Back button for sub-pages. Goes to the previous page in history when there is
 * one (i.e. you navigated here from inside the app); otherwise falls back to a
 * sensible parent route so a fresh deep-link load isn't stranded.
 */
export function BackButton({
  fallbackHref = "/app",
  label = "Back",
  className = "",
}: {
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className={`rl-btn text-xs inline-flex items-center gap-1 ${className}`}
    >
      <span aria-hidden>←</span> {label}
    </button>
  );
}
