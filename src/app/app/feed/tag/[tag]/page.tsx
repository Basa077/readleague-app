import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listFeedByTagAction } from "@/app/actions/feed";
import { TagFeedClient } from "./TagFeedClient";

export default async function TagPage(props: { params: Promise<{ tag: string }> }) {
  const user = await requireUser();
  const { tag } = await props.params;
  const clean = decodeURIComponent(tag).replace(/^#/, "").toLowerCase().slice(0, 40);
  const initial = await listFeedByTagAction(clean);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="rl-serif text-2xl truncate">#{clean}</h1>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>Readers posting about #{clean}</p>
        </div>
        <Link href="/app/feed" className="rl-btn text-sm shrink-0">← Feed</Link>
      </header>
      <TagFeedClient tag={clean} initial={initial} me={{ id: user.id, role: user.role }} />
    </div>
  );
}
