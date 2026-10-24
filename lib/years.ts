export const MIN_YEAR = -50000;
export const MAX_YEAR = 2026;
export const MAX_POS = 2026;
// Piecewise-linear slider: finer resolution where the record is dense.
const SEG: [number, number, number, number][] = [
  [0, 150, -50000, -9000],
  [150, 350, -9000, -3000],
  [350, 650, -3000, 0],
  [650, 1000, 0, 1000],
  [1000, 2026, 1000, 2026],
];
export function posToYear(p: number): number {
  const c = Math.min(MAX_POS, Math.max(0, p));
  for (const [p0, p1, y0, y1] of SEG) if (c <= p1) return Math.round(y0 + ((c - p0) / (p1 - p0)) * (y1 - y0));
  return MAX_YEAR;
}
export function yearToPos(y: number): number {
  const c = Math.min(MAX_YEAR, Math.max(MIN_YEAR, y));
  for (const [p0, p1, y0, y1] of SEG) if (c <= y1) return Math.round(p0 + ((c - y0) / (y1 - y0)) * (p1 - p0));
  return MAX_POS;
}
export const fmtYear = (y: number) => (y <= 0 ? `${-y || 1} BCE` : `${y} CE`);
export function eraName(y: number): string {
  const E: [number, string][] = [
    [-3000, "Prehistory"], [-1500, "Indus Valley age"], [-600, "Vedic age"], [-185, "Mahajanapadas and Mauryas"],
    [320, "Post-Mauryan kingdoms"], [550, "Gupta era"], [1206, "Early medieval kingdoms"], [1526, "Delhi Sultanate"],
    [1707, "Mughal age"], [1857, "Company rule"], [1947, "British Raj"],
  ];
  for (const [lim, n] of E) if (y < lim) return n;
  return "Republic of India";
}
