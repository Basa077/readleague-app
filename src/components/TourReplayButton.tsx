"use client";

import { startTour } from "./Tour";

export function TourReplayButton({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => startTour()} className={className ?? "rl-btn w-full"}>
      Replay the tour
    </button>
  );
}
