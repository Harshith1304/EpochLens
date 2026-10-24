// Turns data/year-notes/YYYY.txt (one file per year, bullet lists) into data/year-notes.json.
// Usage: node scripts/build-year-notes.mjs   (add a 2010.txt file, run it again, restart the dev server)
import fs from "node:fs";
import path from "node:path";

const DIR = "data/year-notes";
const M = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MR = M.join("|");
const PUB = "Year-in-review notes";
const clean = (s) =>
  s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/\s+/g, " ").trim();

const out = [];
for (const f of fs.readdirSync(DIR).filter((n) => /^\d{4}\.txt$/.test(n)).sort()) {
  const year = Number(f.slice(0, 4));
  let month = null;
  for (const raw of fs.readFileSync(path.join(DIR, f), "utf8").split(/\r?\n/)) {
    const t = raw.trim();
    if (!t) continue;
    const bullet = /^[•\-*▪◦]\s*/.test(t);
    const body = clean(t.replace(/^[•\-*▪◦]\s*/, ""));
    const heading = new RegExp(`^(${MR})$`).exec(body.replace(/[:\s]+$/, ""));
    if (!bullet && heading) { month = heading[1]; continue; }
    let text = null;
    if (bullet) {
      if (/:$/.test(body) && body.length < 50) continue; // category label such as "Natural Disasters:"
      text = body;
    } else if (raw.includes("\t")) {
      const [a, ...rest] = raw.split("\t").map(clean).filter(Boolean);
      const b = rest.join(" ");
      if (a && b.length > 30) text = `${a}: ${b}`;
    } else if (/^[A-Z][\w.' -]+: .{40,}/.test(body)) {
      text = body;
    }
    if (!text || text.length < 25) continue;
    const dm = new RegExp(`\\b(${MR})\\s+(\\d{1,2})(?:\\s*[–-]\\s*(\\d{1,2}))?\\b`).exec(text.slice(0, 110));
    const mm = new RegExp(`\\b(${MR})\\b`).exec(text.slice(0, 60));
    const d = dm ? `${dm[2]}${dm[3] ? "–" + dm[3] : ""} ${dm[1]}` : mm ? mm[1] : month;
    text = text.replace(new RegExp(`^(${MR})\\s+\\d{1,2}(?:\\s*[–-]\\s*\\d{1,2})?(?:,\\s*\\d{4})?:\\s*`), "");
    out.push({ s: year, e: year, t: text, d: d ?? null, p: [PUB] });
  }
}
fs.writeFileSync("data/year-notes.json", JSON.stringify(out));
const years = [...new Set(out.map((x) => x.s))];
console.log(`${out.length} entries across ${years.length} years: ${years.join(", ")}`);
