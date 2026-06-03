"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminCreateBookAction, type UploadState } from "@/app/actions/upload";

const init: UploadState = {};

export function NewBookForm({ leagues }: { leagues: { id: string; name: string }[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(adminCreateBookAction, init);
  const [lockType, setLockType] = useState<"open" | "league_winner" | "league_top_n" | "admin_grant">("open");
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok && state.bookId) router.push(`/admin/books/${state.bookId}`);
  }, [state, router]);

  return (
    <form action={formAction} encType="multipart/form-data" className="rl-card p-5 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Title</label>
          <input name="title" required maxLength={200} className="rl-input" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Author</label>
          <input name="author" required maxLength={120} className="rl-input" />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Select label="Genre" name="genre" required options={[
          ["fiction", "Fiction"], ["nonfic", "Non-Fiction"], ["sci", "Science"],
          ["history", "History"], ["self", "Self-Help"], ["poetry", "Poetry"], ["academic", "Academic"],
        ]} />
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Year (optional)</label>
          <input name="year" type="number" min={1500} max={2099} className="rl-input" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Description</label>
        <textarea name="description" rows={3} maxLength={1200} className="rl-input" />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>File · PDF or EPUB · max 25 MB (optional but recommended)</label>
        <label htmlFor="file" className="rl-card-sunken block px-4 py-5 text-center text-sm cursor-pointer transition hover:bg-[var(--paper-3)]" style={{ borderRadius: "var(--radius-md)" }}>
          {fileName ? <span className="font-medium">{fileName}</span> : <span className="rl-serif">Choose a file</span>}
          <input
            id="file"
            name="file"
            type="file"
            accept=".pdf,.epub,application/pdf,application/epub+zip"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
      </div>

      <div className="rl-divider my-2" />

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Unlock requirement</label>
        <select name="lockType" value={lockType} onChange={(e) => setLockType(e.target.value as typeof lockType)} className="rl-input">
          <option value="open">Open — anyone can read</option>
          <option value="league_winner">Reward — league winner only</option>
          <option value="league_top_n">Reward — top N of a league</option>
          <option value="admin_grant">Locked — coordinator grants only</option>
        </select>
      </div>

      {(lockType === "league_winner" || lockType === "league_top_n") && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label="Which league?" name="lockLeagueId" required options={leagues.map((l) => [l.id, l.name])} />
          {lockType === "league_top_n" && (
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Top N</label>
              <input name="lockPosition" type="number" min={1} max={20} defaultValue={4} className="rl-input" />
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Note shown to readers</label>
        <input name="lockNote" maxLength={200} className="rl-input" placeholder="e.g. End-of-season reward" />
      </div>

      {state.error && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ background: "var(--claret-soft)", color: "var(--claret)" }}>
          {state.error}
        </div>
      )}

      <button type="submit" disabled={pending} className="rl-btn rl-btn-primary w-full">
        {pending ? "Creating…" : "Create book"}
      </button>
    </form>
  );
}

function Select({ label, options, ...rest }: { label: string; options: [string, string][] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>{label}</label>
      <select {...rest} className="rl-input">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
}
