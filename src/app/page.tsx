import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (session) {
    redirect(session.role === "coordinator" ? "/admin" : "/app");
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center gap-2">
          <span className="rl-serif text-xl">ReadLeague</span>
          <span className="rl-pill">beta</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="rl-btn">Log in</Link>
          <Link href="/signup" className="rl-btn rl-btn-primary">Sign up</Link>
        </nav>
      </header>

      <section className="flex-1 grid md:grid-cols-2 gap-12 items-center px-6 md:px-16 py-16 max-w-6xl mx-auto w-full">
        <div className="space-y-6 rl-fadeup">
          <h1 className="text-5xl md:text-6xl leading-tight">
            Climb the leagues.<br />
            <span style={{ color: "var(--accent)" }}>Earn the books.</span>
          </h1>
          <p className="text-lg" style={{ color: "var(--ink-2)" }}>
            ReadLeague turns reading into a season. Log your sessions, climb from
            Tuareg to Asante, and unlock reward books only champions can read.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/signup" className="rl-btn rl-btn-primary px-6 py-3">Start reading</Link>
            <Link href="/login" className="rl-btn px-6 py-3">I have an account</Link>
          </div>
        </div>

        <div className="rl-card p-6 space-y-4">
          <div className="rl-serif text-lg">The five leagues</div>
          <ol className="space-y-2 text-sm">
            {[
              ["Asante", "Asantehene", "800+ pts/wk"],
              ["Yoruba", "Alaafin", "600+"],
              ["Zulu", "iSilo", "400+"],
              ["Maasai", "Oloiboni", "250+"],
              ["Tuareg", "Amenokal", "Entry"],
            ].map(([name, title, threshold], i) => (
              <li
                key={name}
                className="flex items-center justify-between px-3 py-2 rounded-md"
                style={{ background: i === 0 ? "var(--accent-soft)" : "var(--paper-3)" }}
              >
                <div>
                  <div className="font-medium">{name} League</div>
                  <div className="text-xs" style={{ color: "var(--ink-3)" }}>Champion: {title}</div>
                </div>
                <div className="rl-mono text-xs" style={{ color: "var(--ink-3)" }}>{threshold}</div>
              </li>
            ))}
          </ol>
          <div className="text-xs" style={{ color: "var(--ink-3)" }}>
            Top of each league promotes. Bottom three relegate. New reward books
            unlock when you finish high.
          </div>
        </div>
      </section>

      <footer className="px-6 py-6 text-xs text-center" style={{ color: "var(--ink-3)" }}>
        Read more. Climb higher.
      </footer>
    </main>
  );
}
