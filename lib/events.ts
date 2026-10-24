import raw from "@/data/events.json";
import notes from "@/data/year-notes.json";
import { fmtYear, yearToPos } from "./years";

export type Ev = { s: number; e: number; t: string; d: string | null; p: string[] };
export const EVENTS = [...(raw as Ev[]), ...(notes as Ev[])];

export const spanLabel = (x: Ev) => (x.s === x.e ? fmtYear(x.s) : `${fmtYear(x.s)} – ${fmtYear(x.e)}`);

export function forYear(y: number) {
  // Events that begin or happen in this year (multi-source first, file order otherwise), then reigns/periods still running.
  const starts = EVENTS.filter((x) => x.s === y).sort((a, b) => b.p.length - a.p.length);
  const ongoing = EVENTS.filter((x) => x.s < y && x.e >= y).sort((a, b) => a.e - a.s - (b.e - b.s));
  let near: { before: Ev[]; after: Ev[] } | null = null;
  if (!starts.length && !ongoing.length) {
    const sorted = [...EVENTS].sort((a, b) => a.s - b.s);
    near = { before: sorted.filter((x) => x.e < y).slice(-3).reverse(), after: sorted.filter((x) => x.s > y).slice(0, 3) };
  }
  return { starts, ongoing, near };
}

/** Event density per slider bucket, drawn as a sparkline above the slider. */
export function density(buckets: number, maxPos: number): number[] {
  const out = new Array<number>(buckets).fill(0);
  for (const x of EVENTS) out[Math.min(buckets - 1, Math.floor((yearToPos(x.s) / maxPos) * buckets))]++;
  return out;
}

/** One short line for the shareable card: headline plus the start of its detail, without date and acronym clutter. */
export function brief(t: string, max = 118): string {
  let s = t.replace(/\s+/g, " ").trim();
  s = s.replace(/\s*\((?:January|February|March|April|May|June|July|August|September|October|November|December)[^)]*\)/g, "");
  s = s.replace(/\s*\([A-Z][A-Z0-9&.\-]{1,8}\)/g, "");
  const first = s.split(/(?<=[a-z0-9)”"%])\.\s+(?=[A-Z])/)[0];
  if (first.length >= 40) s = first;
  s = s.replace(/\.$/, "");
  const m = /^([^:]{4,48}):\s+(.+)$/.exec(s);
  if (m) s = `${m[1]} — ${m[2].replace(/^(The|A|An)\s+/, "")}`;
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return cut.slice(0, sp > 60 ? sp : max - 1).replace(/[,;:\s]+$/, "") + "…";
}

/** n items spread evenly across the list, so a busy year shows variety rather than only its first rows. */
export function pickEven<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  return Array.from({ length: n }, (_, i) => arr[Math.round((i * (arr.length - 1)) / (n - 1))]);
}
