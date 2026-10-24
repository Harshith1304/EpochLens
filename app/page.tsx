"use client";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { brief, density, forYear, pickEven, spanLabel, type Ev } from "@/lib/events";
import { renderYearCard, MAX_ROWS } from "@/lib/card";
import { MAX_POS, MAX_YEAR, MIN_YEAR, eraName, fmtYear, posToYear, yearToPos } from "@/lib/years";

const Scene = dynamic(() => import("@/components/Scene"), { ssr: false });
const PRESETS: [string, number][] = [
  ["Indus cities", -2500], ["Ashoka", -261], ["Guptas", 320], ["Delhi Sultanate", 1206], ["Panipat", 1526], ["Plassey", 1757],
  ["1857", 1857], ["Dandi March", 1930], ["Independence", 1947], ["COVID-19", 2020], ["Chandrayaan-3", 2023], ["Operation Sindoor", 2025],
];
const BARS = 80;
const TICKS: [string, number][] = [["50,000 BCE", -50000], ["3000 BCE", -3000], ["0", 0], ["1000", 1000], ["1500", 1500], ["1947", 1947], ["2026", 2026]];

function Card({ x, n }: { x: Ev; n: number }) {
  return (
    <article className="card wide" style={{ animationDelay: `${Math.min(n, 10) * 30}ms` }}>
      <div>
        <div className="yr">{x.d ? `${x.d} ${fmtYear(x.s)}` : spanLabel(x)}</div>
        <p>{x.t}</p>
        <a href={`https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(x.t.slice(0, 120) + " India")}`} target="_blank" rel="noopener noreferrer">Read the full story →</a>
      </div>
    </article>
  );
}

type Made = { url: string; file: File };

export default function Page() {
  const [dark, setDark] = useState(true);
  const [year, setYear] = useState(1947);
  const [text, setText] = useState("1947");
  const [bce, setBce] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<Made | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setDark(document.documentElement.dataset.theme !== "light");
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function");
  }, []);
  useEffect(() => {
    if (!made) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const toggle = () => {
    const next = !dark; setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem("q-theme", next ? "dark" : "light"); } catch {}
  };

  const go = (y: number) => {
    const c = Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(y)));
    setYear(c); setBce(c <= 0); setText(String(Math.abs(c) || 1));
  };
  const commit = (t: string, isBce: boolean) => {
    const n = parseInt(t, 10);
    if (Number.isFinite(n) && n > 0) setYear(Math.min(MAX_YEAR, Math.max(MIN_YEAR, isBce ? -n : n)));
  };

  const { starts, ongoing, near } = useMemo(() => forYear(year), [year]);
  const bars = useMemo(() => density(BARS, MAX_POS), []);
  const max = Math.max(...bars);
  const pos = yearToPos(year);
  const here = Math.min(BARS - 1, Math.floor((pos / MAX_POS) * BARS));
  const total = starts.length + ongoing.length;

  const close = () => setMade((m) => { if (m) URL.revokeObjectURL(m.url); return null; });

  const makeCard = async () => {
    setBusy(true); setErr("");
    try {
      const pool = starts.length >= MAX_ROWS ? starts : [...starts, ...ongoing];
      const chosen = pickEven(pool, MAX_ROWS);
      const rows = chosen.map((x) => ({ label: x.s === year && x.d ? x.d : x.s === x.e ? fmtYear(x.s) : spanLabel(x), text: brief(x.t) }));
      const blob = await renderYearCard({ year: fmtYear(year), era: eraName(year), rows, more: Math.max(0, total - chosen.length) }, dark ? "dark" : "light");
      const file = new File([blob], `epochlens-india-${year <= 0 ? `${-year}-bce` : year}.png`, { type: "image/png" });
      setMade({ url: URL.createObjectURL(blob), file });
    } catch { setErr("Couldn’t create the image. Please try again."); }
    setBusy(false);
  };
  const shareCard = async () => {
    if (!made) return;
    try {
      if (navigator.canShare({ files: [made.file] })) await navigator.share({ files: [made.file], title: `India in ${fmtYear(year)}` });
      else setErr("This browser can’t share images. Use Download instead.");
    } catch { /* user closed the share sheet */ }
  };
  const fileOk = made && canShare && navigator.canShare({ files: [made.file] });

  return (
    <>
      <Scene dark={dark} seed={Math.abs(year) * 0.013 + 1} />
      <main>
        <header className="top">
          <span className="logo">EpochLens <em style={{ color: "var(--acc)", fontStyle: "normal" }}>India</em></span>
          <button className="btn" onClick={toggle} aria-label="Toggle colour theme">{dark ? "Light" : "Dark"}</button>
        </header>

        <section className="hero">
          <h1>Slide through<br />the story of <em>India</em>.</h1>
          <p>Type a year or drag the timeline. See what was happening across the subcontinent, from the Indus cities and Ashoka to Plassey, 1857 and independence, up to 2026.</p>
          <div className="picker">
            <input className="yr-in" inputMode="numeric" maxLength={4} value={text} aria-label="Year"
              onChange={(e) => { const t = e.target.value.replace(/\D/g, ""); setText(t); commit(t, bce); }} />
            <select value={bce ? "BCE" : "CE"} aria-label="Era" onChange={(e) => { const b = e.target.value === "BCE"; setBce(b); commit(text, b); }}>
              <option>CE</option><option>BCE</option>
            </select>
          </div>
          <div className="chips" style={{ margin: 0 }}>
            {PRESETS.map(([n, y]) => <button key={n} className="btn" onClick={() => go(y)}>{n}</button>)}
          </div>
        </section>

        <section aria-live="polite">
          <div className="yearbar">
            <div className="yearrow">
              <button className="btn nbtn" onClick={() => go(year - 1)} aria-label="Previous year">−1</button>
              <span className="bigyear">{fmtYear(year)}</span>
              <button className="btn nbtn" onClick={() => go(year + 1)} aria-label="Next year">+1</button>
              <span className="era">{eraName(year)}</span>
              <button className="btn primary cardbtn" onClick={makeCard} disabled={busy || total === 0}>{busy ? "Creating…" : "Create year card"}</button>
            </div>
            <div className="spark" aria-hidden>{bars.map((c, i) => <i key={i} className={i === here ? "on" : ""} style={{ height: `${Math.max(6, (c / max) * 100)}%` }} />)}</div>
            <input type="range" min={0} max={MAX_POS} step={1} value={pos} aria-label="Year slider" onChange={(e) => go(posToYear(Number(e.target.value)))} />
            <div className="ticks">{TICKS.map(([l, y]) => <span key={l} style={{ left: `${(yearToPos(y) / MAX_POS) * 100}%` }}>{l}</span>)}</div>
          </div>
          {err && <p className="msg">{err}</p>}

          {starts.length > 0 && <><h3 className="sec">In {fmtYear(year)}</h3><div className="grid">{starts.map((x, n) => <Card key={`${x.s}${x.t}`} x={x} n={n} />)}</div></>}
          {ongoing.length > 0 && <><h3 className="sec">Also underway: reigns and periods</h3><div className="grid">{ongoing.slice(0, 24).map((x, n) => <Card key={`${x.s}${x.e}${x.t}`} x={x} n={n} />)}</div></>}
          {near && (
            <>
              <p className="msg">Nothing is recorded for {fmtYear(year)} in the source notes. Nearest entries:</p>
              <div className="grid">{[...near.before.reverse(), ...near.after].map((x, n) => <Card key={`${x.s}${x.t}`} x={x} n={n} />)}</div>
            </>
          )}
          <p className="note">Entries come from exam-preparation timelines and notes (Testbook, SSCStudy, Gradeup, Byju’s Exam Prep, Q-files, a 1857–1947 dates-and-events compilation and a general Indian-history timeline), plus year-in-review summaries for 2004–2006 and 2013–2026. They are not primary sources: the same event can carry slightly different dates in different notes, and ancient dates are traditional estimates. Use “Read the full story” to check anything you plan to publish. Coverage is thinnest from 2007 to 2012 and before 1000 BCE.</p>
        </section>
      </main>

      {made && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Year card" onClick={close}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={made.url} alt={`EpochLens India card for ${fmtYear(year)}`} />
            <div className="actions">
              <a className="btn primary" href={made.url} download={made.file.name}>Download PNG</a>
              {fileOk && <button className="btn" onClick={shareCard}>Share…</button>}
              <button className="btn" onClick={close}>Close</button>
            </div>
            {fileOk && <p className="hint">Share opens your device’s share sheet, so you can post the card to Instagram, WhatsApp and other apps.</p>}
          </div>
        </div>
      )}
    </>
  );
}
