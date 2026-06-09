"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TrendingTag, TrendingBook } from "@/app/actions/feed";

export function Trending({ tags, books }: { tags: TrendingTag[]; books: TrendingBook[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  const search = () => {
    const clean = q.trim().replace(/^#/, "").toLowerCase();
    if (clean) router.push(`/app/feed/tag/${encodeURIComponent(clean)}`);
  };

  if (tags.length === 0 && books.length === 0) {
    return (
      <div className="rl-card p-3">
        <SearchInput q={q} setQ={setQ} onSearch={search} />
        <div className="text-[12px] mt-2" style={{ color: "var(--ink-3)" }}>
          Add <span className="rl-mono">#hashtags</span> to your posts — trending topics &amp; books will show up here.
        </div>
      </div>
    );
  }

  return (
    <div className="rl-card p-3 space-y-3">
      <SearchInput q={q} setQ={setQ} onSearch={search} />

      {tags.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-3)" }}>🔥 Trending</div>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Link key={t.tag} href={`/app/feed/tag/${t.tag}`} className="rl-pill text-[12px]" title={`${t.count} post${t.count > 1 ? "s" : ""}`}>
                #{t.tag} <span style={{ color: "var(--ink-3)" }}>{t.count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {books.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-3)" }}>📈 Books people are reading</div>
          <div className="flex flex-col gap-1">
            {books.map((b) => (
              <Link key={b.id} href={`/app/books/${b.id}`} className="flex items-center justify-between text-[13px] px-2 py-1 rounded-md hover:bg-[var(--paper-3)]">
                <span className="truncate"><span className="font-medium">{b.title}</span> <span style={{ color: "var(--ink-3)" }}>· {b.author}</span></span>
                <span className="rl-mono text-[11px] shrink-0" style={{ color: "var(--accent-ink)" }}>{b.mentions}×</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchInput({ q, setQ, onSearch }: { q: string; setQ: (v: string) => void; onSearch: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: "var(--ink-3)" }}>#</span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSearch(); }}
        placeholder="Search a hashtag — e.g. trending, africa, stoicism"
        className="flex-1 rounded-full px-3 py-1.5 text-sm"
        style={{ background: "var(--paper-2)", border: "0.5px solid var(--line)" }}
      />
      <button onClick={onSearch} className="rl-btn text-xs">Search</button>
    </div>
  );
}
