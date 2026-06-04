import { UploadBookForm } from "./UploadBookForm";
import { BackButton } from "@/components/BackButton";
import { db, schema } from "@/db";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

export default async function UploadPage() {
  const user = await requireUser();
  const recent = await db
    .select()
    .from(schema.books)
    .where(eq(schema.books.uploaderId, user.id))
    .orderBy(desc(schema.books.createdAt))
    .limit(8);

  const approved = recent.filter((b) => b.status === "approved").length;
  const pending = recent.filter((b) => b.status === "pending").length;
  const [league] = user.leagueId
    ? await db.select().from(schema.leagues).where(eq(schema.leagues.id, user.leagueId)).limit(1)
    : [null];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6 rl-fadeup">
      <BackButton fallbackHref="/app" label="Back" />

      <header>
        <h1 className="rl-serif text-3xl">Add a book</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
          Submit a PDF or EPUB. Once your coordinator approves it, the whole league can read it —
          and you earn a +2 weekly bonus per approved book.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Approved" value={approved} suffix="books" />
        <Stat label="Pending" value={pending} suffix="review" />
        <Stat label="Tickets" value={user.tickets} suffix="held" tone="accent" />
      </div>

      {league && (
        <div className="rl-card p-3 text-xs flex items-center justify-between" style={{ color: "var(--ink-2)" }}>
          <span>
            In <b>{league.name}</b>: every <span className="rl-mono">{league.uploadsRequired}</span> approved
            upload this cycle earns you 1 promotion ticket 🎟.
          </span>
          <span className="rl-mono" style={{ color: "var(--accent-ink)" }}>
            {user.cycleUploads}/{league.uploadsRequired}
          </span>
        </div>
      )}

      <UploadBookForm />

      {recent.length > 0 && (
        <section>
          <div className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--ink-3)" }}>
            Your recent uploads
          </div>
          <div className="rl-card divide-y" style={{ borderColor: "var(--line)" }}>
            {recent.map((b) => (
              <div key={b.id} className="p-3 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <div className="font-medium line-clamp-1">{b.title}</div>
                  <div className="text-xs" style={{ color: "var(--ink-3)" }}>{b.author} · {b.format ?? "—"}</div>
                </div>
                <span className={`rl-pill ${b.status === "approved" ? "is-active" : ""}`}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, suffix, tone }: { label: string; value: number | string; suffix?: string; tone?: "accent" }) {
  return (
    <div className="rl-card p-3 text-center">
      <div className="rl-serif text-2xl" style={tone === "accent" ? { color: "var(--accent-ink)" } : undefined}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
        {label} {suffix && <span className="rl-mono">{suffix}</span>}
      </div>
    </div>
  );
}
