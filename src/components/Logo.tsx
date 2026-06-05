import Link from "next/link";

/**
 * ReadLeague brand mark — a heraldic shield (the kingdom leagues:
 * Asante → Yoruba → Zulu → Maasai → Tuareg) cradling an open book (reading).
 * Self-contained colours so it renders identically in nav, on cream, or as a
 * favicon. Scales cleanly from 16px to hero size.
 */
export function Logo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="rl-shield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3C8460" />
          <stop offset="1" stopColor="#235439" />
        </linearGradient>
      </defs>
      {/* shield */}
      <path
        d="M16 2.6 L27.4 6.2 V15.6 C27.4 22.2 22.4 27 16 29.4 C9.6 27 4.6 22.2 4.6 15.6 V6.2 Z"
        fill="url(#rl-shield)"
      />
      <path
        d="M16 4.4 L25.6 7.4 V15.6 C25.6 21 21.5 25.1 16 27.4 C10.5 25.1 6.4 21 6.4 15.6 V7.4 Z"
        stroke="rgba(255,255,255,0.16)"
        strokeWidth="0.8"
      />
      {/* open book pages */}
      <g fill="#F7F1E4">
        <path d="M16 11 C13.4 9.5 10.4 9.2 7.7 9.8 V18.8 C10.4 18.2 13.4 18.5 16 20 Z" />
        <path d="M16 11 C18.6 9.5 21.6 9.2 24.3 9.8 V18.8 C21.6 18.2 18.6 18.5 16 20 Z" />
      </g>
      {/* spine */}
      <path d="M16 11 V20" stroke="#235439" strokeWidth="0.9" strokeLinecap="round" />
      {/* page lines */}
      <g stroke="#B9A98A" strokeWidth="0.7" strokeLinecap="round">
        <path d="M9.7 12.4 H13.6" />
        <path d="M9.7 14.1 H13.6" />
        <path d="M9.7 15.8 H13.2" />
        <path d="M18.4 12.4 H22.3" />
        <path d="M18.4 14.1 H22.3" />
        <path d="M18.8 15.8 H22.3" />
      </g>
    </svg>
  );
}

/**
 * Logo + serif wordmark. `href` makes it a link (default /app); pass `href={null}`
 * for a static mark (e.g. on auth pages).
 */
export function Wordmark({
  size = 26,
  href = "/app",
  className,
  textClassName = "text-lg",
}: {
  size?: number;
  href?: string | null;
  className?: string;
  textClassName?: string;
}) {
  const inner = (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Logo size={size} />
      <span className={`rl-serif leading-none ${textClassName}`}>
        Read<span style={{ color: "var(--accent-ink)" }}>League</span>
      </span>
    </span>
  );
  if (href === null) return inner;
  return (
    <Link href={href} className="inline-flex items-center">
      {inner}
    </Link>
  );
}
