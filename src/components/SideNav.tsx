"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "./LogoutButton";
import { Wordmark } from "./Logo";

const ITEMS = [
  { href: "/app",          label: "Discover",   tour: "nav-discover" },
  { href: "/app/feed",     label: "Feed",       tour: "nav-feed" },
  { href: "/app/library",  label: "Library",    tour: "nav-library" },
  { href: "/app/upload",   label: "Add a book", tour: "nav-add" },
  { href: "/app/leagues",  label: "Leagues",    tour: "nav-leagues" },
  { href: "/app/profile",  label: "Profile",    tour: "nav-profile" },
];

export function SideNav({
  user,
}: {
  user: { displayName: string; handle: string; weeklyPts: number; tickets: number; leagueId: string | null };
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/app/read/")) return null;
  return (
    <aside className="hidden md:flex w-64 sticky top-0 self-start h-screen flex-col border-r" style={{ borderColor: "var(--line)", background: "var(--paper-2)" }}>
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--line)" }}>
        <Wordmark href="/app" size={26} textClassName="text-xl" />
        <div className="text-[10px] uppercase tracking-wider mt-1.5" style={{ color: "var(--ink-3)" }}>
          {user.leagueId ?? "no league"} · {user.weeklyPts} pts
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 text-sm">
        {ITEMS.map((l) => {
          const active = l.href === "/app" ? pathname === "/app" || pathname.startsWith("/app/books") : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              data-tour={l.tour}
              className="block px-3 py-2 rounded-md transition"
              style={{
                color: active ? "var(--accent-ink)" : "var(--ink-2)",
                background: active ? "var(--accent-soft)" : "transparent",
                fontWeight: active ? 600 : 400,
              }}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t space-y-2" style={{ borderColor: "var(--line)" }}>
        <div className="text-xs" style={{ color: "var(--ink-2)" }}>{user.displayName}</div>
        <div className="text-[10px]" style={{ color: "var(--ink-3)" }}>@{user.handle}</div>
        {user.tickets > 0 && (
          <div className="text-xs px-2 py-1 rounded-md" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
            🎟 {user.tickets} promotion ticket{user.tickets > 1 ? "s" : ""}
          </div>
        )}
        <LogoutButton className="rl-btn w-full text-xs" />
      </div>
    </aside>
  );
}
