"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { readerUploadBookAction, type UploadState } from "@/app/actions/upload";
import { uploadBookFile } from "@/lib/blob-client";

const init: UploadState = {};

export function UploadBookForm() {
  const [state, formAction, pending] = useActionState(readerUploadBookAction, init);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setFileName(null);
      setFileSize(0);
    }
  }, [state.ok]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);
    const form = e.currentTarget;
    const file = fileRef.current?.files?.[0];
    if (!file) { setClientError("Please choose a PDF or EPUB file."); return; }

    const fd = new FormData(form);
    fd.delete("file");
    setUploading(true);
    try {
      const uploaded = await uploadBookFile(file);
      fd.set("fileUrl", uploaded.url);
      fd.set("format", uploaded.format);
      fd.set("fileSize", String(uploaded.size));
    } catch (err) {
      setUploading(false);
      setClientError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      return;
    }
    setUploading(false);
    formAction(fd);
  }

  const busy = uploading || pending;

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="rl-card p-5 space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Title</label>
        <input name="title" required maxLength={200} className="rl-input" placeholder="e.g. Things Fall Apart" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Author</label>
        <input name="author" required maxLength={120} className="rl-input" placeholder="e.g. Chinua Achebe" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Genre" name="genre" required options={[
          ["fiction", "Fiction"], ["nonfic", "Non-Fiction"], ["sci", "Science"],
          ["history", "History"], ["self", "Self-Help"], ["poetry", "Poetry"], ["academic", "Academic"],
        ]} />
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Year (optional)</label>
          <input name="year" type="number" min={1500} max={2099} className="rl-input" placeholder="2024" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Description (optional)</label>
        <textarea name="description" rows={3} maxLength={1200} className="rl-input" placeholder="A short note about the book" />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Book file · PDF or EPUB · max 50 MB</label>
        <label
          htmlFor="file"
          className="rl-card-sunken block px-4 py-6 text-center text-sm cursor-pointer transition hover:bg-[var(--paper-3)]"
          style={{ borderRadius: "var(--radius-md)" }}
        >
          {fileName ? (
            <>
              <div className="font-medium">{fileName}</div>
              <div className="text-xs" style={{ color: "var(--ink-3)" }}>{(fileSize / 1024 / 1024).toFixed(2)} MB · click to replace</div>
            </>
          ) : (
            <>
              <div className="rl-serif">Choose a file</div>
              <div className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>PDF (.pdf) or EPUB (.epub)</div>
            </>
          )}
          <input
            ref={fileRef}
            id="file"
            name="file"
            type="file"
            accept=".pdf,.epub,application/pdf,application/epub+zip"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) { setFileName(f.name); setFileSize(f.size); }
            }}
          />
        </label>
      </div>

      {(clientError || state.error) && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ background: "var(--claret-soft)", color: "var(--claret)" }}>
          {clientError || state.error}
        </div>
      )}
      {state.ok && (
        <div className="text-xs px-3 py-2 rounded-md" style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}>
          {state.autoApproved
            ? "✓ Approved automatically — your book is live in the library now, and you earned +2 weekly pts."
            : "Submitted for review — a coordinator will take a quick look shortly."}
        </div>
      )}

      <button type="submit" disabled={busy} className="rl-btn rl-btn-primary w-full">
        {uploading ? "Uploading file…" : pending ? "Finishing up…" : "Submit for approval"}
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
