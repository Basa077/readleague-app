/**
 * Football-style scoring. Max 3 points per session.
 *   3 = full session (≥ 20 pages OR ≥ 30 minutes of real reading)
 *   2 = solid session (≥ 10 pages OR ≥ 15 minutes)
 *   1 = light session (any reading)
 *   0 = nothing logged
 *
 * Pages are weighted more than time — actually-read pages are the truth.
 * Time helps when page counts are uncertain (e.g. EPUB with shifting locations).
 */
export function computePoints(pagesRead: number, minutes: number): number {
  if (pagesRead <= 0 && minutes <= 0) return 0;
  // Page-weighted score (pages dominate)
  const pageScore = pagesRead / 10; // 1 pt per 10 pages
  const timeScore = minutes / 30;   // 1 pt per 30 min
  // Pages count double when both are present
  const raw = pagesRead > 0 ? pageScore * 2 + timeScore : timeScore;
  const rounded = Math.round(raw);
  return Math.max(1, Math.min(3, rounded));
}

// Bonus pts granted to the uploader when their book is approved
export const UPLOAD_APPROVAL_BONUS = 2;
