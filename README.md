# EpochLens India

**Slide through the story of the subcontinent.** Type a year or drag the timeline to see what was happening in India, from the Palaeolithic and the Indus cities to Plassey, 1857, independence and 2026. Turn any year into a shareable PNG card.

> Live demo: _add your deployed URL here_

## Features

- **Year explorer.** Type a year with a CE/BCE switch, step with −1/+1, jump with preset chips (Indus cities, Ashoka, Plassey, Independence, COVID-19 and more) or drag the slider.
- **Non-linear slider.** Covers 50,000 BCE to 2026, with finer steps in recent centuries so single years such as 1857 or 1947 are easy to hit. An event-density sparkline above it shows where the record is rich or thin.
- **Era labels.** Each year is placed in a period (Indus Valley age, Mauryas, Gupta era, Delhi Sultanate, Mughal age, British Raj, Republic of India).
- **Events and ongoing periods.** Shows what happened in the chosen year, plus reigns and periods still running. If a year has no entry, it shows the nearest entries before and after.
- **Year cards.** One click creates a 1080 × 1350 PNG with the year at the top, up to six events with a short description each, and a footer. The layout is fixed, so a busy year and a quiet year look equally balanced. Download it, or use the device share sheet (Web Share API) where the browser supports sharing images.
- **Light and dark themes.** A warm heritage palette (parchment and maroon in light, verdigris and antique gold in dark), saved in `localStorage`, with no flash on load.
- **3D background.** A slowly turning chakra built with Three.js line geometry that follows the pointer and recolours with the theme. Respects `prefers-reduced-motion`.
- **Fast and static.** The data ships as JSON, so there is no backend or database. The page is pre-rendered by Next.js.

## Tech stack

| Area | Tools |
|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript |
| 3D | Three.js via `@react-three/fiber` |
| Image export | Canvas 2D API, Web Share API |
| Styling | Plain CSS with theme variables, self-hosted fonts (Fraunces, Inter via Fontsource) |
| Data pipeline | Python (`pdfplumber`, `pdftotext`, `pyspellchecker`) and Node.js |

## Data and methodology

The dataset has **1,330 entries** covering **420 distinct years** between 50,000 BCE and 2026.

| Source | Used for |
|---|---|
| Testbook / SSCStudy Indian history timeline PDFs | Year-by-year chronology tables |
| Gradeup and Byju's Exam Prep timeline PDFs | Dynasty and period tables with short remarks |
| "Timeline: Indian History" study notes | Two-column year : event table |
| "Dates and Events of Indian History 1857–1947" | Detailed events with exact dates |
| Q-files timeline of Indian history | Short events from ancient times to the 21st century |
| Year-in-review notes (`data/year-notes/YYYY.txt`) | 2004–2006 and 2013–2026 |

How it is built:

1. `scripts/extract.py` reads the PDFs and writes `data/events.json`. It handles BCE/CE ranges, two-column tables, short end years such as "1807–13", wrapped lines and ranges that span eras.
2. Near-duplicate entries for the same period from different files are merged.
3. Known extraction defects (broken words, truncated lines, text bleeding in from web-page pop-ups) are repaired or dropped.
4. `scripts/build-year-notes.mjs` turns the per-year text files into `data/year-notes.json`, detecting day and month labels.
5. The app merges both files at build time.

### Accuracy

- The sources are exam-preparation notes and summaries, **not primary sources**. The same event can carry different dates in different notes, and ancient dates are traditional estimates.
- Every card has a **Read the full story** link that searches Wikipedia for that event, so you can check it.
- Coverage is thinnest for 2007–2012 and before 1000 BCE.
- A scanned 469-page encyclopaedia of Indian events was tested with OCR and **excluded**, because the recognised text contained too many errors for a project that should not show wrong facts. `scripts/ocr_encyclopaedia.sh` and the `ENC=1` option in `extract.py` remain if you have a cleaner copy.

## Getting started

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build
npm start
```

## Adding more years

1. Create a text file named for the year in `data/year-notes/`, for example `2010.txt`, with one event per bullet (`•` or `-`). A line such as `• March 22: …` gives the card a "22 March" label, and month headings such as `January` are picked up too.
2. Run `node scripts/build-year-notes.mjs`.
3. Restart the dev server.

## Regenerating the PDF data

Only needed if you change the source PDFs. Place them where `scripts/extract.py` expects them (see the `SRC` path at the top of the file), install `pdfplumber` and `pyspellchecker`, then run `python scripts/extract.py`.

## Project structure

```
app/
  layout.tsx        metadata, fonts, theme bootstrap script
  page.tsx          year explorer, slider, year-card dialog
  globals.css       theme variables, glass year bar, slider and scrollbar styling
components/
  Scene.tsx         3D chakra
lib/
  events.ts         merges data, looks up a year, builds short card text
  years.ts          slider position <-> year mapping, era names
  card.ts           canvas drawing of the PNG year card
data/
  events.json       generated from the PDFs
  year-notes/       one text file per year
  year-notes.json   generated from year-notes/
scripts/
  extract.py        PDF -> events.json
  build-year-notes.mjs
  ocr_encyclopaedia.sh
```

## Deploying

The site is static, so any host works. With Vercel: push the repository to GitHub, import it at https://vercel.com/new and deploy. No environment variables are needed.

## Security

`npm audit` reports 0 vulnerabilities. Next.js is pinned to a patched 15.5.x release, and `package.json` overrides the PostCSS version that Next bundles.

## Roadmap

- Fill the 2007–2012 gap and add more entries before 1000 BCE.
- Shareable links to a specific year (`/year/1857`).
- Region filter (north, south, east, west, northeast).
- Primary-source citations for the most-viewed years.

## Credits and licence

Event text comes from third-party study notes listed above. Check their terms before publishing the site publicly or reusing the data. Fonts: Fraunces and Inter (SIL Open Font License). The application code is yours to license as you choose.
