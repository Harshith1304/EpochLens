# EpochLens India

Slide through the story of the subcontinent. Pick a year (or drag the timeline) and see what was happening, then save the year as a PNG card.

Stack: Next.js 15, React 19, TypeScript, react-three-fiber, canvas-rendered year cards.

Data:
- `data/events.json`: built from the exam-prep PDFs by `scripts/extract.py` (Python, needs pdfplumber; already generated).
- `data/year-notes/YYYY.txt`: one bullet-list file per year. Add a file (for example 2010.txt), then run `node scripts/build-year-notes.mjs` and restart the dev server.

    npm install
    npm run dev
