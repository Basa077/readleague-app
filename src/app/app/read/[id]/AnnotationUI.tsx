"use client";

import { useState } from "react";
import { HIGHLIGHT_COLORS, colorMeta, type HighlightColorKey } from "@/lib/annotations";
import type { Anno } from "./useAnnotations";

/** Row of colour swatches; each swatch is a meaning. */
export function ColorSwatches({
  active,
  onPick,
  size = 26,
}: {
  active?: string;
  onPick: (key: HighlightColorKey) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.key}
          onClick={() => onPick(c.key)}
          title={`${c.label} — ${c.hint}`}
          className="rounded-full transition hover:scale-110 shrink-0"
          style={{
            width: size,
            height: size,
            background: c.hex,
            outline: active === c.key ? "2px solid var(--ink)" : "1px solid rgba(0,0,0,0.18)",
            outlineOffset: 1,
          }}
          aria-label={c.label}
        />
      ))}
    </div>
  );
}

function ColorDot({ color, size = 12 }: { color: string; size?: number }) {
  return <span className="inline-block rounded-full shrink-0" style={{ width: size, height: size, background: colorMeta(color).hex }} />;
}

/** Floating toolbar shown over a fresh text selection. */
export function SelectionToolbar({
  x,
  y,
  onPick,
  onCancel,
}: {
  x: number;
  y: number;
  onPick: (key: HighlightColorKey) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed z-[60] rl-card px-2 py-1.5 flex items-center gap-2 shadow-lg"
      style={{ left: x, top: y, transform: "translate(-50%, -120%)", background: "var(--paper-2)" }}
      onMouseDown={(e) => e.preventDefault()} // keep the text selection alive
    >
      <span className="text-[11px] pl-1" style={{ color: "var(--ink-3)" }}>Highlight:</span>
      <ColorSwatches onPick={onPick} size={22} />
      <button onClick={onCancel} className="text-[11px] px-1" style={{ color: "var(--ink-4)" }} title="Cancel">✕</button>
    </div>
  );
}

/** Small editor for a single annotation: note text, colour, share, delete. */
export function NoteEditor({
  anno,
  onChange,
  onDelete,
  onClose,
}: {
  anno: Anno;
  onChange: (patch: { note?: string; color?: HighlightColorKey; shared?: boolean }) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState(anno.note ?? "");
  const meta = colorMeta(anno.color);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(20,16,12,0.35)" }} onClick={onClose}>
      <div className="rl-card w-full max-w-md p-4" style={{ background: "var(--paper)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ColorDot color={anno.color} />
            <span className="text-sm rl-serif">{meta.label}</span>
          </div>
          <button onClick={onClose} className="rl-btn text-xs">Done</button>
        </div>

        {anno.selectedText && (
          <blockquote className="text-[13px] rl-serif italic mb-3 pl-3 border-l-2 line-clamp-4" style={{ borderColor: meta.hex, color: "var(--ink-2)" }}>
            “{anno.selectedText}”
          </blockquote>
        )}

        <label className="text-[11px] block mb-1" style={{ color: "var(--ink-3)" }}>Your note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => { if (note !== (anno.note ?? "")) onChange({ note }); }}
          placeholder="What did you like? What do you want others to learn?"
          rows={3}
          className="w-full rounded-md p-2 text-sm resize-y"
          style={{ background: "var(--paper-2)", border: "0.5px solid var(--line)", color: "var(--ink)" }}
        />

        <div className="mt-3">
          <div className="text-[11px] mb-1" style={{ color: "var(--ink-3)" }}>Meaning / colour</div>
          <ColorSwatches active={anno.color} onPick={(c) => onChange({ color: c })} size={24} />
        </div>

        <label className="flex items-center gap-2 mt-3 text-[13px] cursor-pointer">
          <input
            type="checkbox"
            checked={anno.shared}
            onChange={(e) => onChange({ shared: e.target.checked })}
          />
          <span>Share with readers of this book <span style={{ color: "var(--ink-3)" }}>— so others can learn from it</span></span>
        </label>

        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "0.5px solid var(--line)" }}>
          <button onClick={() => { onChange({ note }); onClose(); }} className="rl-btn rl-btn-primary text-xs">Save note</button>
          <button onClick={onDelete} className="text-xs" style={{ color: "var(--danger)" }}>Delete highlight</button>
        </div>
      </div>
    </div>
  );
}

/** The legend (what each colour means) — shown inside the notes panel. */
function Legend() {
  return (
    <div className="rl-card p-3 mb-3" style={{ background: "var(--paper-2)" }}>
      <div className="text-[11px] uppercase tracking-wide mb-2" style={{ color: "var(--ink-3)" }}>What the colours mean</div>
      <ul className="space-y-1.5">
        {HIGHLIGHT_COLORS.map((c) => (
          <li key={c.key} className="flex items-center gap-2 text-[12px]">
            <ColorDot color={c.key} />
            <span className="font-medium">{c.label}</span>
            <span style={{ color: "var(--ink-3)" }}>— {c.hint}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Slide-over panel listing all highlights/notes for this book. */
export function NotesPanel({
  items,
  onJump,
  onEdit,
  onClose,
}: {
  items: Anno[];
  onJump: (anno: Anno) => void;
  onEdit: (anno: Anno) => void;
  onClose: () => void;
}) {
  const mine = items.filter((a) => a.mine);
  const shared = items.filter((a) => !a.mine && a.shared);

  return (
    <div className="absolute inset-0 z-[55] flex" onClick={onClose}>
      <div className="flex-1" style={{ background: "rgba(20,16,12,0.25)" }} />
      <aside
        className="w-full max-w-sm h-full flex flex-col"
        style={{ background: "var(--paper)", borderLeft: "0.5px solid var(--line)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="rl-serif text-base">My highlights & notes</div>
          <button onClick={onClose} className="rl-btn text-xs">Close ✕</button>
        </div>

        <div className="flex-1 overflow-y-auto rl-scroll p-3">
          <Legend />

          {mine.length === 0 ? (
            <div className="text-[13px] text-center py-6" style={{ color: "var(--ink-3)" }}>
              Pick a colour, then drag across some text to make your first highlight.
            </div>
          ) : (
            <ul className="space-y-2">
              {mine.map((a) => (
                <AnnoRow key={a.id} a={a} onJump={onJump} onEdit={onEdit} editable />
              ))}
            </ul>
          )}

          {shared.length > 0 && (
            <>
              <div className="text-[11px] uppercase tracking-wide mt-5 mb-2" style={{ color: "var(--ink-3)" }}>
                Shared by other readers
              </div>
              <ul className="space-y-2">
                {shared.map((a) => (
                  <AnnoRow key={a.id} a={a} onJump={onJump} onEdit={onEdit} />
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function AnnoRow({
  a,
  onJump,
  onEdit,
  editable = false,
}: {
  a: Anno;
  onJump: (anno: Anno) => void;
  onEdit: (anno: Anno) => void;
  editable?: boolean;
}) {
  const meta = colorMeta(a.color);
  return (
    <li className="rl-card p-2.5" style={{ background: "var(--paper-2)" }}>
      <div className="flex items-start gap-2">
        <span className="mt-1"><ColorDot color={a.color} /></span>
        <button className="text-left flex-1 min-w-0" onClick={() => onJump(a)}>
          <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--ink-3)" }}>
            <span>{meta.label}</span>
            {a.page ? <span>· p.{a.page}</span> : null}
            {!editable ? <span>· {a.authorName}</span> : a.shared ? <span>· shared</span> : null}
          </div>
          {a.selectedText && (
            <div className="text-[13px] rl-serif italic line-clamp-2 mt-0.5">“{a.selectedText}”</div>
          )}
          {a.note && (
            <div className="text-[12px] mt-1" style={{ color: "var(--ink-2)" }}>{a.note}</div>
          )}
        </button>
        {editable && (
          <button onClick={() => onEdit(a)} className="text-[11px] px-1 shrink-0" style={{ color: "var(--accent-ink)" }} title="Edit note">✎</button>
        )}
      </div>
    </li>
  );
}
