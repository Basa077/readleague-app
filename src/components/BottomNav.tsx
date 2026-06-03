"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/app",          label: "Discover", icon: DiscoverIcon, match: (p: string) => p === "/app" || p.startsWith("/app/books") },
  { href: "/app/library",  label: "Library",  icon: LibraryIcon,  match: (p: string) => p.startsWith("/app/library") },
  { href: "/app/upload",   label: "Add",      icon: AddIcon,      match: (p: string) => p.startsWith("/app/upload"), highlight: true },
  { href: "/app/leagues",  label: "Leagues",  icon: TrophyIcon,   match: (p: string) => p.startsWith("/app/leagues") },
  { href: "/app/profile",  label: "Profile",  icon: ProfileIcon,  match: (p: string) => p.startsWith("/app/profile") },
];

export function BottomNav() {
  const pathname = usePathname();
  // Hide bottom nav inside reader for full immersion
  if (pathname.startsWith("/app/read/")) return null;
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur" style={{ background: "color-mix(in oklab, var(--paper) 90%, transparent)", borderColor: "var(--line)" }}>
      <div className="max-w-md mx-auto grid grid-cols-5 px-1 pt-1.5 pb-2">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 py-1.5 rounded-md transition"
              style={{
                color: active ? "var(--accent-ink)" : "var(--ink-3)",
                background: active ? "var(--accent-soft)" : "transparent",
              }}
            >
              <Icon active={active} highlight={item.highlight} />
              <span className="text-[10px] tracking-wide" style={{ fontWeight: active ? 600 : 400 }}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const stroke = "currentColor";

function DiscoverIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="7" height="16" rx="1.5" />
      <rect x="14" y="4" width="7" height="9" rx="1.5" />
      <rect x="14" y="15" width="7" height="5" rx="1.5" />
    </svg>
  );
}
function LibraryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h3v16H4zM10 4h3v16h-3z" />
      <path d="M18 5l3 16-3-16z" transform="rotate(8 18 13)" />
    </svg>
  );
}
function AddIcon({ active, highlight }: { active: boolean; highlight?: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={active || highlight ? 2.4 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v4a4 4 0 1 1-8 0V4z" />
      <path d="M16 6h3v2a3 3 0 0 1-3 3M8 6H5v2a3 3 0 0 0 3 3" />
      <path d="M10 14h4v3a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-3zM9 21h6" />
    </svg>
  );
}
function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={active ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}
