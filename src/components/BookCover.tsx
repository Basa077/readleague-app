const GENRE_COVERS: Record<string, { bg: string; accent: string; pattern?: string }> = {
  fiction: { bg: "linear-gradient(155deg, #2C4F3D 0%, #1A3225 100%)", accent: "#D8B062" },
  nonfic:  { bg: "linear-gradient(155deg, #C5A572 0%, #8B6F47 100%)", accent: "#F4ECD8" },
  sci:     { bg: "linear-gradient(170deg, #1A2540 0%, #2D3F5F 60%, #0E1726 100%)", accent: "#8FC2E8" },
  history: { bg: "linear-gradient(155deg, #6B2A1F 0%, #4A1B12 100%)", accent: "#E0C28A" },
  self:    { bg: "linear-gradient(155deg, #E8DCC8 0%, #C8B89A 100%)", accent: "#3B2A1A" },
  poetry:  { bg: "linear-gradient(155deg, #3B2A6B 0%, #1F1448 100%)", accent: "#F0C8E0" },
  academic:{ bg: "linear-gradient(155deg, #1F1F1F 0%, #0E0E0E 100%)", accent: "#D4B144" },
};

export function BookCover({
  title,
  author,
  genre,
  size = 110,
  locked,
  reward,
}: {
  title: string;
  author: string;
  genre: string;
  size?: number;
  locked?: boolean;
  reward?: boolean;
}) {
  const palette = GENRE_COVERS[genre] || GENRE_COVERS.fiction;
  const w = size;
  const h = Math.round(size * 1.45);
  // typography sizing
  const titleSize = Math.max(10, Math.round(size / 8.2));
  const authorSize = Math.max(8, Math.round(size / 13));

  return (
    <div
      className="relative rounded-md overflow-hidden shrink-0"
      style={{
        width: w,
        height: h,
        background: palette.bg,
        color: palette.accent,
        boxShadow: "0 4px 12px rgba(0,0,0,0.18), inset 1px 0 0 rgba(255,255,255,0.08)",
      }}
    >
      {/* spine highlight */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(0,0,0,0.18))" }} />
      <div className="absolute inset-0 flex flex-col justify-between p-2.5">
        <div
          style={{
            fontFamily: "var(--serif)",
            fontWeight: 500,
            fontSize: titleSize,
            lineHeight: 1.15,
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: authorSize, opacity: 0.75, fontFamily: "var(--sans)" }}>
          {author}
        </div>
      </div>
      {reward && (
        <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider" style={{ background: "rgba(255,255,255,0.15)", color: "#F4ECD8", backdropFilter: "blur(4px)" }}>
          Reward
        </div>
      )}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
      )}
    </div>
  );
}
