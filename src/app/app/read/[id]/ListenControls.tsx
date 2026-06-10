"use client";

import type { useReadAloud } from "./useReadAloud";

type RA = ReturnType<typeof useReadAloud>;

/** Compact Listen / pause / stop / speed control for the readers. */
export function ListenControls({ ra, onPlay }: { ra: RA; onPlay: () => void }) {
  if (!ra.supported) return null;
  return (
    <div className="flex items-center gap-1.5">
      {!ra.speaking ? (
        <button onClick={onPlay} className="rl-btn text-xs" title="Read this book aloud">🔊 Listen</button>
      ) : (
        <>
          <button onClick={ra.paused ? ra.resume : ra.pause} className="rl-btn text-xs" title={ra.paused ? "Resume" : "Pause"}>
            {ra.paused ? "▶" : "⏸"}
          </button>
          <button onClick={ra.stop} className="rl-btn text-xs" title="Stop reading">⏹</button>
          <select
            value={ra.rate}
            onChange={(e) => ra.setRate(Number(e.target.value))}
            title="Reading speed"
            className="rl-btn text-xs"
            style={{ padding: "2px 4px", background: "transparent" }}
          >
            {[0.8, 1, 1.25, 1.5, 1.75, 2].map((r) => (
              <option key={r} value={r}>{r}×</option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
