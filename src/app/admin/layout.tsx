import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { Wordmark } from "@/components/Logo";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/api/logout"); // clear stale cookie → login (avoids redirect loop)
  if (user.role !== "coordinator") redirect("/app");

  return (
    <div className="min-h-screen flex" style={{ background: "var(--paper)" }}>
      <aside className="hidden md:flex w-56 flex-col border-r" style={{ borderColor: "var(--line)" }}>
        <div className="px-5 py-5 border-b" style={{ borderColor: "var(--line)" }}>
          <Wordmark href="/admin" size={24} textClassName="text-lg" />
          <div className="text-[10px] uppercase tracking-wider mt-1.5" style={{ color: "var(--ink-3)" }}>Coordinator</div>
        </div>
        <AdminNav variant="side" />
        <div className="p-3 border-t" style={{ borderColor: "var(--line)" }}>
          <div className="text-xs mb-2" style={{ color: "var(--ink-2)" }}>{user.displayName}</div>
          <LogoutButton className="rl-btn w-full text-xs" />
        </div>
      </aside>

      {/* mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--line)" }}>
          <span className="flex items-center gap-2">
            <Wordmark href="/admin" size={22} textClassName="text-base" />
            <span className="rl-pill text-[10px]">admin</span>
          </span>
          <LogoutButton className="rl-btn text-xs px-2 py-1" />
        </header>
        <AdminNav variant="top" />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
