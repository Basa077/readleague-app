import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/api/logout"); // clear stale cookie → login (avoids redirect loop)
  if (user.role !== "coordinator") redirect("/app");

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/approvals", label: "Approvals" },
    { href: "/admin/books", label: "Books" },
    { href: "/admin/ladder", label: "Ladder" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/cycle", label: "Cycle" },
    { href: "/admin/announcements", label: "Announcements" },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "var(--paper)" }}>
      <aside className="hidden md:flex w-56 flex-col border-r" style={{ borderColor: "var(--line)" }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: "var(--line)" }}>
          <Link href="/admin" className="rl-serif text-lg">ReadLeague</Link>
          <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "var(--ink-3)" }}>Coordinator</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="block px-3 py-2 rounded-md hover:bg-[var(--paper-3)]" style={{ color: "var(--ink-2)" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t" style={{ borderColor: "var(--line)" }}>
          <div className="text-xs mb-2" style={{ color: "var(--ink-2)" }}>{user.displayName}</div>
          <LogoutButton className="rl-btn w-full text-xs" />
        </div>
      </aside>

      {/* mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
          <Link href="/admin" className="rl-serif">ReadLeague · admin</Link>
          <LogoutButton className="rl-btn text-xs px-2 py-1" />
        </header>
        <nav className="md:hidden px-2 py-2 flex gap-1 overflow-x-auto text-xs border-b" style={{ borderColor: "var(--line)" }}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rl-pill whitespace-nowrap">{l.label}</Link>
          ))}
        </nav>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
