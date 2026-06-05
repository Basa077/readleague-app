"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/books", label: "Books" },
  { href: "/admin/ladder", label: "Ladder" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/cycle", label: "Cycle" },
  { href: "/admin/announcements", label: "Announcements" },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminNav({ variant }: { variant: "side" | "top" }) {
  const pathname = usePathname();

  if (variant === "top") {
    return (
      <nav className="md:hidden px-2 py-2 flex gap-1 overflow-x-auto text-xs border-b rl-scroll" style={{ borderColor: "var(--line)" }}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`rl-pill whitespace-nowrap ${isActive(pathname, l.href) ? "is-active" : ""}`}>
            {l.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5 text-sm">
      {LINKS.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
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
  );
}
