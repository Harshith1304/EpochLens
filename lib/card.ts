// Draws the shareable "year card" (1080 x 1350, the 4:5 portrait size social apps like).
// The layout is fixed: same header, same six row slots, same footer for every year,
// so a quiet year and a busy year produce equally balanced images.
export type CardRow = { label: string; text: string };
export type CardData = { year: string; era: string; rows: CardRow[]; more: number };
export type CardTheme = { bg: string; bg2: string; fg: string; mut: string; acc: string; acc2: string; line: string; glow: string; glow0: string };
type Ctx = CanvasRenderingContext2D;

export const CARD_W = 1080;
export const CARD_H = 1350;
export const MAX_ROWS = 6;
export const CARD_THEMES: Record<"dark" | "light", CardTheme> = {
  dark: { bg: "#0c1714", bg2: "#10201b", fg: "#f1e7cf", mut: "#a8a38d", acc: "#d9a441", acc2: "#4aa58c", line: "rgba(241,231,207,0.16)", glow: "rgba(217,164,65,0.18)", glow0: "rgba(217,164,65,0)" },
  light: { bg: "#f5edda", bg2: "#efe3c8", fg: "#2a2017", mut: "#6e5f4d", acc: "#8c2f28", acc2: "#b8872e", line: "rgba(42,32,23,0.16)", glow: "rgba(140,47,40,0.12)", glow0: "rgba(140,47,40,0)" },
};
export const SERIF = '"Fraunces Variable", Georgia, "Times New Roman", serif';
export const SANS = '"Inter Variable", "Segoe UI", system-ui, sans-serif';

function spaced(ctx: Ctx, px: string) { (ctx as unknown as { letterSpacing: string }).letterSpacing = px; }

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function wrap(ctx: Ctx, text: string, maxW: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "", i = 0;
  for (; i < words.length; i++) {
    const test = cur ? `${cur} ${words[i]}` : words[i];
    if (ctx.measureText(test).width <= maxW) { cur = test; continue; }
    if (lines.length === maxLines - 1) break;
    lines.push(cur); cur = words[i];
  }
  if (i < words.length) { // out of room: finish the last line with an ellipsis
    let last = `${cur} ${words.slice(i).join(" ")}`;
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxW) last = last.slice(0, last.lastIndexOf(" ") > 0 ? last.lastIndexOf(" ") : -1);
    lines.push(`${last.replace(/[,;:\s]+$/, "")}…`);
  } else if (cur) lines.push(cur);
  return lines;
}

function chakra(ctx: Ctx, cx: number, cy: number, r: number, color: string, a = 1) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.globalAlpha = a;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.55 * a; ctx.beginPath(); ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.8 * a; ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    ctx.beginPath(); ctx.moveTo(cx + c * r * 0.16, cy + s * r * 0.16); ctx.lineTo(cx + c * r * 0.88, cy + s * r * 0.88); ctx.stroke();
  }
  ctx.restore();
}

export function drawCard(ctx: Ctx, d: CardData, t: CardTheme) {
  const W = CARD_W, H = CARD_H, PAD = 84;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, t.bg); g.addColorStop(1, t.bg2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const rg = ctx.createRadialGradient(880, 190, 10, 880, 190, 640); rg.addColorStop(0, t.glow); rg.addColorStop(1, t.glow0);
  ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = t.line; ctx.lineWidth = 2; roundRect(ctx, 36, 36, W - 72, H - 72, 30); ctx.stroke();

  chakra(ctx, 790, 920, 360, t.acc, 0.07); // faint watermark keeps sparse years from looking empty
  chakra(ctx, 884, 184, 92, t.acc);
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  ctx.fillStyle = t.acc; ctx.font = `600 22px ${SANS}`; spaced(ctx, "6px"); ctx.fillText("EPOCHLENS  ·  INDIA", PAD, 118); spaced(ctx, "0px");

  let size = 150;
  ctx.font = `600 ${size}px ${SERIF}`;
  while (ctx.measureText(d.year).width > 700 && size > 80) { size -= 6; ctx.font = `600 ${size}px ${SERIF}`; }
  ctx.fillStyle = t.fg; ctx.fillText(d.year, PAD, 318);
  ctx.fillStyle = t.acc; ctx.font = `500 32px ${SANS}`; ctx.fillText(d.era, PAD, 376);
  const dv = ctx.createLinearGradient(PAD, 0, W - PAD, 0); dv.addColorStop(0, t.acc); dv.addColorStop(1, t.glow0);
  ctx.fillStyle = dv; ctx.fillRect(PAD, 420, W - PAD * 2, 3);

  const top = 462, rowH = 122, listH = rowH * MAX_ROWS;
  const rows = d.rows.slice(0, MAX_ROWS);
  const start = top + (listH - rows.length * rowH) / 2;
  const textX = PAD + 40, textW = W - textX - PAD;
  rows.forEach((r, i) => {
    const y0 = start + i * rowH;
    ctx.save(); ctx.translate(PAD + 10, y0 + 22); ctx.rotate(Math.PI / 4); ctx.fillStyle = t.acc2; ctx.fillRect(-6, -6, 12, 12); ctx.restore();
    ctx.fillStyle = t.acc; ctx.font = `600 21px ${SANS}`; spaced(ctx, "2px"); ctx.fillText(r.label.toUpperCase(), textX, y0 + 28); spaced(ctx, "0px");
    ctx.fillStyle = t.fg; ctx.font = `400 29px ${SANS}`;
    wrap(ctx, r.text, textW, 2).forEach((ln, k) => ctx.fillText(ln, textX, y0 + 68 + k * 37));
    if (i < rows.length - 1) { ctx.fillStyle = t.line; ctx.fillRect(textX, y0 + rowH - 6, textW, 1.5); }
  });

  ctx.fillStyle = t.fg; ctx.font = `500 26px ${SANS}`;
  ctx.fillText(d.more > 0 ? `+ ${d.more} more on EpochLens India` : "Slide through the story of India", PAD, 1262);
  ctx.fillStyle = t.mut; ctx.font = `400 19px ${SANS}`;
  ctx.fillText("Compiled from study notes · verify before citing", PAD, 1298);
}

export async function renderYearCard(d: CardData, theme: "dark" | "light"): Promise<Blob> {
  await Promise.all([
    document.fonts.load(`600 150px ${SERIF}`), document.fonts.load(`400 29px ${SANS}`),
    document.fonts.load(`500 32px ${SANS}`), document.fonts.load(`600 21px ${SANS}`),
  ]).catch(() => undefined);
  const c = document.createElement("canvas"); c.width = CARD_W; c.height = CARD_H;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  drawCard(ctx, d, CARD_THEMES[theme]);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not create the image"))), "image/png"));
}
