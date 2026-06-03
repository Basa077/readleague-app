import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { AnnounceForm } from "./AnnounceForm";

export default async function AnnouncementsPage() {
  const list = await db
    .select({ a: schema.announcements, author: schema.users })
    .from(schema.announcements)
    .leftJoin(schema.users, eq(schema.users.id, schema.announcements.authorId))
    .orderBy(desc(schema.announcements.createdAt));

  return (
    <div className="p-6 max-w-2xl space-y-5 rl-fadeup">
      <h1 className="rl-serif text-2xl">Announcements</h1>

      <AnnounceForm />

      <section className="space-y-2">
        <div className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Posted</div>
        {list.map(({ a, author }) => (
          <div key={a.id} className="rl-card p-4">
            <div className="font-medium">{a.title}</div>
            <div className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>{a.body}</div>
            <div className="text-[10px] mt-2" style={{ color: "var(--ink-3)" }}>
              {author?.displayName ?? "Coordinator"} · {new Date(a.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="text-xs" style={{ color: "var(--ink-3)" }}>No announcements posted yet.</div>
        )}
      </section>
    </div>
  );
}
