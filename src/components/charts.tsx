// Tiny inline SVG charts — no chart library

export function Sparkline({ data, height = 40, width = 200, stroke = "var(--accent)" }: { data: number[]; height?: number; width?: number; stroke?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data);
  const min = Math.min(0, ...data);
  const range = Math.max(1, max - min);
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const path = data
    .map((d, i) => {
      const x = i * step;
      const y = height - ((d - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  // fill area
  const areaPath = `${path} L${(data.length - 1) * step},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block", width: "100%" }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-fill)" />
      <path d={path} stroke={stroke} strokeWidth="1.5" fill="none" />
      {data.length < 24 && data.map((d, i) => {
        const x = i * step;
        const y = height - ((d - min) / range) * height;
        return <circle key={i} cx={x} cy={y} r={1.6} fill={stroke} />;
      })}
    </svg>
  );
}

export function BarChart({ data, labels, height = 80, width = 260, color = "var(--accent)" }: { data: number[]; labels?: string[]; height?: number; width?: number; color?: string }) {
  if (data.length === 0) return null;
  const max = Math.max(1, ...data);
  const barWidth = width / data.length - 4;
  return (
    <svg width={width} height={height + 14} viewBox={`0 0 ${width} ${height + 14}`} style={{ display: "block", width: "100%" }}>
      {data.map((d, i) => {
        const h = (d / max) * height;
        const x = i * (width / data.length) + 2;
        const y = height - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={h} rx="2" fill={color} opacity={d === 0 ? 0.25 : 0.9} />
            {labels?.[i] && <text x={x + barWidth / 2} y={height + 11} textAnchor="middle" fontSize="9" fill="var(--ink-3)" style={{ fontFamily: "var(--mono)" }}>{labels[i]}</text>}
          </g>
        );
      })}
    </svg>
  );
}

export function PositionChart({ data, width = 260, height = 70 }: { data: number[]; width?: number; height?: number }) {
  if (data.length === 0) return null;
  // data = positions; 1 = best (top of league), higher = worse
  const max = Math.max(...data, 5);
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  const path = data
    .map((p, i) => {
      const x = i * step;
      const y = ((p - 1) / Math.max(1, max - 1)) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height + 16} viewBox={`0 0 ${width} ${height + 16}`} style={{ display: "block", width: "100%" }}>
      <line x1="0" y1={height + 1} x2={width} y2={height + 1} stroke="var(--line)" strokeWidth="0.5" />
      <path d={path} stroke="var(--accent)" strokeWidth="1.5" fill="none" />
      {data.map((p, i) => {
        const x = i * step;
        const y = ((p - 1) / Math.max(1, max - 1)) * height;
        return <circle key={i} cx={x} cy={y} r={2.2} fill="var(--accent)" />;
      })}
      <text x="0" y={height + 13} fontSize="9" fill="var(--ink-3)" style={{ fontFamily: "var(--mono)" }}>oldest</text>
      <text x={width} y={height + 13} fontSize="9" fill="var(--ink-3)" textAnchor="end" style={{ fontFamily: "var(--mono)" }}>now</text>
    </svg>
  );
}
