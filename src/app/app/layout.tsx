import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { BottomNav } from "@/components/BottomNav";
import { SideNav } from "@/components/SideNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  // Stale/invalid session (signed cookie but no matching user) → clear it and go
  // to login, instead of bouncing with the middleware into a redirect loop.
  if (!user) redirect("/api/logout");

  return (
    <div className="min-h-screen md:flex" style={{ background: "var(--paper)" }}>
      {/* Sidebar — desktop only */}
      <SideNav
        user={{
          displayName: user.displayName,
          handle: user.handle,
          weeklyPts: user.weeklyPts,
          tickets: user.tickets,
          leagueId: user.leagueId,
        }}
      />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b backdrop-blur" style={{ borderColor: "var(--line)", background: "color-mix(in oklab, var(--paper) 90%, transparent)" }}>
          <Link href="/app" className="rl-serif text-lg">ReadLeague</Link>
          <div className="flex items-center gap-2 text-xs">
            <span className="rl-pill is-active rl-mono">{user.weeklyPts} pts</span>
            {user.tickets > 0 && <span className="rl-pill" title="Promotion tickets">🎟 {user.tickets}</span>}
            <LogoutButton className="rl-btn text-xs px-2 py-1" />
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-0">{children}</main>

        {/* Bottom nav — mobile only */}
        <BottomNav />
      </div>
    </div>
  );
}
