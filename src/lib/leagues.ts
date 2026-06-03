// Infinite league system: pre-defined African empires/civilizations.
// When someone wins the top tier, the next one auto-activates.
// If we run out, we generate procedural ones.

export type LeagueDef = {
  id: string;
  name: string;
  championTitle: string;
  threshold: number;
  uploadsRequired: number;
};

// Tier 1 = top, ascending = lower (Tuareg = entry).
// Listed BOTTOM-UP so order matches "where new readers start".
export const LEAGUE_LADDER: LeagueDef[] = [
  // Entry level → up
  { id: "tuareg",   name: "Tuareg League",   championTitle: "Amenokal",  threshold: 50,   uploadsRequired: 1 },
  { id: "maasai",   name: "Maasai League",   championTitle: "Oloiboni",  threshold: 80,   uploadsRequired: 1 },
  { id: "zulu",     name: "Zulu League",     championTitle: "iSilo",     threshold: 120,  uploadsRequired: 2 },
  { id: "yoruba",   name: "Yoruba League",   championTitle: "Alaafin",   threshold: 160,  uploadsRequired: 2 },
  { id: "asante",   name: "Asante League",   championTitle: "Asantehene",threshold: 200,  uploadsRequired: 3 },
  // Continues forever ↑
  { id: "kongo",    name: "Kongo League",    championTitle: "Manikongo", threshold: 250,  uploadsRequired: 3 },
  { id: "kanem",    name: "Kanem League",    championTitle: "Mai",       threshold: 300,  uploadsRequired: 4 },
  { id: "songhai",  name: "Songhai League",  championTitle: "Askia",     threshold: 360,  uploadsRequired: 4 },
  { id: "mali",     name: "Mali League",     championTitle: "Mansa",     threshold: 420,  uploadsRequired: 5 },
  { id: "aksum",    name: "Aksum League",    championTitle: "Negus",     threshold: 480,  uploadsRequired: 5 },
  { id: "nubia",    name: "Nubia League",    championTitle: "Qore",      threshold: 540,  uploadsRequired: 6 },
  { id: "kemet",    name: "Kemet League",    championTitle: "Pharaoh",   threshold: 600,  uploadsRequired: 6 },
  { id: "carthage", name: "Carthage League", championTitle: "Sufete",    threshold: 660,  uploadsRequired: 7 },
  { id: "ghana",    name: "Ghana League",    championTitle: "Ghana",     threshold: 720,  uploadsRequired: 7 },
  { id: "ethiopia", name: "Ethiopia League", championTitle: "Janhoy",    threshold: 800,  uploadsRequired: 8 },
  { id: "benin",    name: "Benin League",    championTitle: "Oba",       threshold: 880,  uploadsRequired: 8 },
  { id: "swahili",  name: "Swahili League",  championTitle: "Sultani",   threshold: 960,  uploadsRequired: 9 },
  { id: "wolof",    name: "Wolof League",    championTitle: "Burba",     threshold: 1040, uploadsRequired: 9 },
  { id: "ife",      name: "Ife League",      championTitle: "Ooni",      threshold: 1120, uploadsRequired: 10 },
  { id: "lunda",    name: "Lunda League",    championTitle: "Mwata",     threshold: 1200, uploadsRequired: 10 },
];

// Generate the next league when we've outgrown the ladder
export function generateNextLeague(currentTopTier: number): LeagueDef {
  const n = currentTopTier; // tier becomes 0, -1, -2 as we grow upward
  return {
    id: `elder-${Math.abs(n)}`,
    name: `Elder League ${Math.abs(n) + 1}`,
    championTitle: "Sovereign",
    threshold: 1200 + Math.abs(n) * 80,
    uploadsRequired: 10 + Math.abs(n),
  };
}

// Display: top tier first
export function ladderTopDown(): LeagueDef[] {
  return [...LEAGUE_LADDER].reverse();
}
