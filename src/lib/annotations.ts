// Single source of truth for the highlight palette. Each colour carries a
// built-in *meaning* so a highlight communicates intent, not just emphasis.
// Used by the reader UI and the server-side validators.

export type HighlightColorKey = "yellow" | "green" | "blue" | "pink" | "purple";

export type HighlightColor = {
  key: HighlightColorKey;
  label: string;   // the built-in "expression"
  hint: string;    // a longer explanation shown in the legend
  hex: string;     // swatch / EPUB fill
  soft: string;    // translucent fill for the PDF overlay (drawn with multiply)
};

export const HIGHLIGHT_COLORS: readonly HighlightColor[] = [
  { key: "yellow", label: "Important",  hint: "A key idea worth remembering",      hex: "#f4c20d", soft: "rgba(244,194,13,0.40)" },
  { key: "green",  label: "Loved this", hint: "A passage I really enjoyed",        hex: "#34c759", soft: "rgba(52,199,89,0.34)" },
  { key: "blue",   label: "Learn this", hint: "Worth studying or teaching others", hex: "#3b82f6", soft: "rgba(59,130,246,0.32)" },
  { key: "pink",   label: "I disagree", hint: "Something I want to challenge",      hex: "#ff2d92", soft: "rgba(255,45,146,0.30)" },
  { key: "purple", label: "Question",   hint: "Confusing — I want to discuss it",   hex: "#af52de", soft: "rgba(175,82,222,0.32)" },
] as const;

export const COLOR_KEYS: HighlightColorKey[] = HIGHLIGHT_COLORS.map((c) => c.key);

export function colorMeta(key: string): HighlightColor {
  return HIGHLIGHT_COLORS.find((c) => c.key === key) ?? HIGHLIGHT_COLORS[0];
}

export function isColorKey(v: string): v is HighlightColorKey {
  return (COLOR_KEYS as string[]).includes(v);
}

// A lightweight, APA-flavoured citation appended whenever a reader copies text,
// so passages leave the app already attributed — discourages plagiarism and
// keeps us clear of copyright trouble.
export function buildCitation(book: { title: string; author?: string | null; year?: number | null }): string {
  const author = (book.author || "").trim() || "Unknown author";
  const year = book.year ? String(book.year) : "n.d.";
  const title = book.title.trim();
  return `${author} (${year}). ${title}. Read on ReadLeague.`;
}

// Builds the clipboard payload: the copied passage, in quotes, plus its source.
export function citedClipboardText(passage: string, citation: string): string {
  const clean = passage.replace(/\s+/g, " ").trim();
  return `“${clean}”\n\n— ${citation}`;
}
