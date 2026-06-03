import { db, schema } from "@/db";
import { desc } from "drizzle-orm";

export default async function UsersPage() {
  const users = await db.select().from(schema.users).orderBy(desc(schema.users.createdAt));

  return (
    <div className="p-6 space-y-4 rl-fadeup">
      <div className="flex items-center justify-between">
        <h1 className="rl-serif text-2xl">Users</h1>
        <div className="text-xs" style={{ color: "var(--ink-3)" }}>{users.length} total</div>
      </div>
      <div className="rl-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--ink-3)" }}>
              <th className="p-3 font-normal text-xs uppercase tracking-wider">User</th>
              <th className="p-3 font-normal text-xs uppercase tracking-wider">Role</th>
              <th className="p-3 font-normal text-xs uppercase tracking-wider">League</th>
              <th className="p-3 font-normal text-xs uppercase tracking-wider text-right">Weekly</th>
              <th className="p-3 font-normal text-xs uppercase tracking-wider text-right">Total</th>
              <th className="p-3 font-normal text-xs uppercase tracking-wider text-right">Books</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="p-3">
                  <div>{u.displayName}</div>
                  <div className="text-xs" style={{ color: "var(--ink-3)" }}>@{u.handle} · {u.email}</div>
                </td>
                <td className="p-3"><span className="rl-pill">{u.role}</span></td>
                <td className="p-3 text-xs">{u.leagueId ?? "—"}</td>
                <td className="p-3 text-right rl-mono text-xs">{u.weeklyPts}</td>
                <td className="p-3 text-right rl-mono text-xs">{u.totalPts}</td>
                <td className="p-3 text-right rl-mono text-xs">{u.booksRead}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
