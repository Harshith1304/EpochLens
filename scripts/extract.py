import re, json, subprocess, sys
SRC = "/mnt/user-data/uploads/"
def txt(name, layout=True, first=None, last=None):
    a = ["pdftotext"] + (["-layout"] if layout else []) + (["-f", str(first), "-l", str(last)] if first else []) + [SRC + name, "-"]
    return subprocess.run(a, capture_output=True, text=True).stdout
JUNK = re.compile(r"testbook|sscstudy|gradeup|byjus|Download|Page\s*-|^\s*Continue\s*$|^\s*continue\s*$|^\s*\d{1,3}\s*$", re.I)
out = []
FIX = {"In dian": "Indian", "Na tional": "National", "Sul tan": "Sultan", "great est": "greatest", "Sriperum budur": "Sriperumbudur", "Mahapadm ananda": "Mahapadmananda", "Prime Minis- ter": "Prime Minister"}
def add(s, e, text, pub, doc, label=None):
    text = re.sub(r"\s+", " ", text)
    if " : " in text:
        for part in text.split(" : "): add(s, e, part, pub, doc, label)
        return
    for k, v in FIX.items(): text = text.replace(k, v)
    text = re.sub(r"(\w)- (\w)", r"\1\2", re.sub(r"\s+", " ", text)).strip(" .-:;")
    if len(text) > 300: return
    if len(text) < 6 or s is None: return
    out.append(dict(s=s, e=e if e is not None else s, t=text, pub=pub, doc=doc, d=label))
sgn = lambda n, era: -n if era == "BCE" else n

# A) Testbook-style tables (same table appears in three Testbook / SSCStudy files)
RX = re.compile(r"^\s*(\d{1,4})(?:\s*(?:to|–|-)\s*(\d{1,4}))?\s*(BCE|CE)\b\s*(.*)$")
RX2 = re.compile(r"^\s*(\d{4})\s+to\s+(\d{4})\s{2,}(.+)$")
for f in ["chronology-of-indian-history-0e74cf44.pdf", "indian-history-timeline-761da5ad.pdf", "chronology-of-indian-history__sscstudy_com_.pdf"]:
    prev = None
    for ln in txt(f).splitlines():
        if JUNK.search(ln): continue
        m = RX.match(ln); m2 = RX2.match(ln)
        if m:
            a, b, era, rest = m.groups()
            s = sgn(int(a), era); e = sgn(int(b), era) if b else None
            if e is not None and e < s and era == "BCE": s, e = e, s
            if e is not None and e < s: e = None
            prev = len(out); add(s, e, rest, "Testbook", f)
            if len(out) == prev: prev = None
            else: prev = len(out) - 1
        elif m2:
            prev = len(out); add(int(m2.group(1)), int(m2.group(2)), m2.group(3), "Testbook", f); prev = len(out) - 1
        elif prev is not None and ln.startswith("      ") and ln.strip() and not re.match(r"^\s*\d", ln) and len(ln.strip()) < 70:
            out[prev]["t"] = (out[prev]["t"] + " " + ln.strip()).strip()
        else:
            prev = None

# B) "Timeline: Indian History" two-column year : event table (pages 1-6), parsed per column
RB = re.compile(r"^\s*(\d{1,4})\s*(BC|AD)?\s*(?:[-–]\s*(\d{1,4})\s*(BC|AD)?)?\s*:\s*(.+)$")
RCOL = re.compile(r"(?<=\S)\s{3,}(?=\d{1,4}\s*(?:BC|AD)?\s*(?:[-–]\s*\d{1,4}\s*(?:BC|AD)?)?\s*:)")
DOC_B = "Timeline_Indian_History.pdf"
PUB_B = "Timeline: Indian History (study notes)"
def parse_col(cols, era):
    cur = None
    for ln in cols:
        m = RB.match(ln)
        if m:
            a, ea, b, eb, rest = m.groups()
            if ea: era = ea
            s_era = ea or era
            if eb: era = eb
            e_era = eb or s_era
            s = -int(a) if s_era == "BC" else int(a)
            if b and len(b) < len(a) and s_era == e_era: b = a[:len(a) - len(b)] + b
            e = (-int(b) if e_era == "BC" else int(b)) if b else None
            if e is not None and e < s: s, e = e, s
            add(s, e, rest, PUB_B, DOC_B); cur = len(out) - 1
        elif cur is not None and ln.strip() and not re.match(r"^\s*\d{1,4}\b", ln):
            out[cur]["t"] = (out[cur]["t"] + " " + ln.strip()).strip()
        else:
            cur = None
    return era
for pg in range(1, 7):
    pl = txt(DOC_B, True, pg, pg).splitlines()
    starts = [m.start() for l in pl for m in [RCOL.search(l[30:])] if m and False]
    cuts = []
    for l in pl:
        m = RCOL.search(l, 30)
        if m: cuts.append(m.end())
    if not cuts: continue
    cut = sorted(cuts)[len(cuts) // 2]
    left = [l[:cut - 1] for l in pl]; right = [l[cut - 1:] for l in pl]
    era = parse_col(left, "BC" if pg == 1 else "AD")
    parse_col([r.rstrip() for r in right], "AD")

# C) Dates and events 1857-1947, headed by year
raw = txt("dates_and_events_of_indian_history_from_1857-1947.pdf", layout=False)
year = None; yend = None; buf = None
RY = re.compile(r"^\s*(1[89]\d\d)(?:\s*[-–]\s*(\d{2,4}))?\s*$")
RD = re.compile(r"^\s*(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s*(\d{4})\s*:\s*(.*)$", re.S)
def flush():
    global buf
    if buf and year:
        t = buf.strip(); label = None
        m = RD.match(t)
        if m: label = f"{m.group(1)} {m.group(2).title()}"; t = m.group(4)
        add(year, yend, t, "Dates & Events of Indian History 1857–1947", "dates_and_events_of_indian_history_from_1857-1947.pdf", label)
    buf = None
for ln in raw.splitlines():
    if JUNK.search(ln) or "Important dates and events" in ln or "Important Dates" in ln or ln.strip() in ("Indian History", "and", "Events of India"): continue
    ym = RY.match(ln)
    if ym:
        flush(); year = int(ym.group(1)); e2 = ym.group(2)
        yend = None
        if e2:
            e2 = int(e2); yend = e2 if e2 > 99 else (year // 100) * 100 + e2
        continue
    if re.match(r"^\s*(\d+\)|[\uf0b7\uf0a7•●▪]|)\s*\S", ln) and re.match(r"^\s*(\d+\)|[\uf0b7\uf0a7•●▪\uf0d8])", ln):
        flush(); buf = re.sub(r"^\s*(\d+\)|[\uf0b7\uf0a7•●▪\uf0d8])\s*", "", ln)
    elif buf is not None and ln.strip():
        buf += " " + ln.strip()
flush()

# D) Tables in the gradeup / byjus PDFs (pdfplumber), E) Q-files prose timeline
import pdfplumber
def ordinal_century(txt):
    m = re.findall(r"(\d+)(?:st|nd|rd|th)\s*(BC|AD)", txt)
    if not m: return None
    spans = []
    for n, era in m:
        n = int(n)
        spans.append((-(n * 100), -((n - 1) * 100 + 1)) if era == "BC" else ((n - 1) * 100 + 1, n * 100))
    return min(x[0] for x in spans), max(x[1] for x in spans)
def parse_year(cell):
    c = re.sub(r"\s+", " ", cell.replace(",", "")).strip()
    cs = ordinal_century(c)
    if cs: return cs
    m = re.match(r"^(?:Pre-Harappan Phase\s*[–-]\s*)?(?:From\s*)?(\d{1,7})\s*(BC|AD)?\s*(?:to|[–-])?\s*(\d{1,7})?\s*(BC|AD)?", c)
    if not m: return None
    a, ea, b2, eb = m.groups()
    if not a: return None
    era = eb or ea or "AD"
    if b2 and len(b2) < len(a) and (ea or era) == era: b2 = a[:len(a) - len(b2)] + b2
    sa = -int(a) if (ea or era) == "BC" else int(a)
    sb = (-int(b2) if era == "BC" else int(b2)) if b2 else None
    if sb is not None and sb < sa: sa, sb = sb, sa
    return sa, sb
for f, pub in [("History_timeline__sscstudy_com_.pdf", "Gradeup Indian history timeline"),
               ("timeline_of_indian_history__sscstudy_com_.pdf", "Byju's Exam Prep timeline")]:
    with pdfplumber.open(SRC + f) as pdf:
        for pg in pdf.pages:
            for tb in pg.extract_tables():
                for r in tb:
                    if not r or len(r) < 2 or r[1] is None or not r[0] or r[0].strip().lower() == "year": continue
                    ys = [y for y in r[0].split("\n")]
                    ev = [x for x in (r[1] or "").split("\n")]
                    rem = re.sub(r"\s+", " ", (r[2] or "")).strip() if len(r) > 2 else ""
                    if len(ys) == len(ev) and len(ys) > 1 and r[0].count("BC") + r[0].count("AD") >= len(ys) - 1 and all(re.search(r"\d", y) for y in ys):
                        pairs = [(y, e, "") for y, e in zip(ys, ev)]
                        pairs[0] = (pairs[0][0], pairs[0][1], rem)
                    else:
                        pairs = [(" ".join(ys), " ".join(ev), rem)]
                    for y, e, rm in pairs:
                        py = parse_year(y)
                        if py is None: continue
                        e = re.sub(r"\s+", " ", e).strip()
                        add(py[0], py[1], e + (" — " + rm if rm and rm != e else ""), pub, f)

QRX = re.compile(r"^(?:c\.\s*)?(\d{1,4})\s*(BCE|CE)?\s*(?:[–-]\s*(\d{1,4})\s*(BCE|CE)?)?\s+(\([A-Za-z]+\)\s*)?(?=[A-Z])(.+)$")
QNOISE = re.compile(r"Q-files|Welcome to|expert-verified|encyclopedia|Continue on|DOWNLOAD|Advertisement|Discover more|Browse Reference|Science|You are here|Timeline of Indian history|^\s*×|www\.q|©", re.I)
qtxt = [l for l in txt("Timeline_of_Indian_history_-_Q-files_-_Search___Read___Discover.pdf", layout=False).splitlines()]
para = []; paras = []
for l in qtxt + ["1 End"]:
    if QNOISE.search(l) or not l.strip(): continue
    if QRX.match(l.strip()):
        if para: paras.append(" ".join(para))
        para = [l.strip()]
    elif para: para.append(l.strip())
qera = "BCE"
for p in paras:
    m = QRX.match(p)
    if not m: continue
    a, ea, b2, eb, mon, rest = m.groups()
    if eb and not ea: ea = eb
    if ea: qera = ea
    if not ea and int(a) >= 600: qera = "CE"
    sa = -int(a) if (ea or qera) == "BCE" else int(a)
    sb = None
    if b2:
        if len(b2) < len(a): b2 = a[:len(a) - len(b2)] + b2
        sb = -int(b2) if (eb or ea or qera) == "BCE" else int(b2)
        if sb < sa: sa, sb = sb, sa
    if re.search(r"fully|updated|Continue on|removing the website|Welcome", rest): continue   # modal text bled into this entry
    first = re.split(r"(?<=[a-z0-9\)])\.\s+(?=[A-Z(\d])", rest)[0].strip()
    first = re.sub(r"^\([A-Za-z]+\)\s*", "", first)
    if len(first) > 165:
        cut = first[:165].rfind(", ")
        if cut < 70: continue
        first = first[:cut]
    add(sa, sb, (mon.strip() + " " if mon else "") + first, "Q-files timeline of Indian history", "Timeline_of_Indian_history_-_Q-files.pdf")

# F) Encyclopaedia of Indian Events & Dates (scanned; OCR'd to /tmp/ocr/p/NNN.txt by tesseract at 300 dpi)
import os, difflib
ENC = "Encyclopaedia of Indian Events & Dates"
ENCDOC = "2015_111273_Encyclopaedia-Of-Indian-Events-And-Dates.pdf"
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
ENABLE_ENC = os.environ.get("ENC") == "1"   # scanned book: OCR is too noisy for publication, so off by default
def page(n):
    if not ENABLE_ENC: return ""
    p = f"/tmp/ocr/p/{n:03d}.txt"
    return open(p, encoding="utf-8", errors="ignore").read() if os.path.exists(p) else ""
HEAD = re.compile(r"ENCYCLOP|EVENTS BY|DYNASTIES|CYCLOPAED|EACYCLO|EXCYCLO|TACYCLO", re.I)
def clean(t):
    t = re.sub(r"\(\s*[Ss]ee[^)]*\)?", "", t)
    t = re.sub(r"\s+", " ", t).strip(" .-:;,")
    return t
from spellchecker import SpellChecker
from collections import Counter as _C
_sp = SpellChecker()
_ocr = " ".join(page(n) for n in range(8, 327))
_freq = _C(re.findall(r"[A-Za-z][A-Za-z]+", _ocr))
_clean = {w.lower() for ev in out if ev["pub"] != ENC for w in re.findall(r"[A-Za-z]{3,}", ev["t"])}
SHORT = set("a i an as at be by do he if in is it me my no of on or so to up us we am ad ox".split())
def good(t):
    if len(t) < 20: return False
    toks = re.findall(r"[A-Za-z][A-Za-z'’]*", t)
    if len(toks) < 4 or re.search(r"[^\x20-\x7e’‘]", t): return False
    bad = 0
    for w in toks:
        w2 = re.sub(r"['’]s?$", "", w); wl = w2.lower()
        if len(wl) <= 2: ok = wl in SHORT
        else: ok = wl in _sp or wl in _clean or (w2[0].isupper() and _freq[w2] >= 3)
        if not ok:
            bad += 1
            if bad > 0: return False
    return len(re.findall(r"[^A-Za-z0-9 ,.'\-()\"’‘:;/&?]", t)) <= 2
def emit(y, e, text, label=None):
    t = clean(text)
    if len(t) > 280:
        t = re.split(r"(?<=[a-z\)])\.\s+(?=[A-Z])", t)[0][:280]
    if good(t) and e * 1 == e:
        add(y, None, t, ENC, ENCDOC, label)
# F1) "Events by dates": month/day headings, then "YYYY text" lines
cur = None; buf = None; lab = None
def flush2():
    global buf
    if buf: emit(buf[0], 0, buf[1], lab)
    buf = None
for n in range(8, 89):
    for ln in page(n).splitlines():
        ln = ln.strip()
        if not ln or HEAD.search(ln) or re.match(r"^\d{1,3}$", ln): continue
        m = re.match(r"^([A-Za-z]{3,10})\s+(\d{1,2})$", ln)
        if m:
            c = difflib.get_close_matches(m.group(1).title(), MONTHS, 1, 0.7)
            if c and 1 <= int(m.group(2)) <= 31:
                flush2(); lab = f"{int(m.group(2))} {c[0]}"; continue
        m = re.match(r"^([\$SIl|!]?\d{3})\s+(.+)$", ln)
        if m and lab:
            yr = m.group(1)
            if not yr.isdigit(): yr = "1" + yr[1:]
            y = int(yr)
            if 300 <= y <= 2015:
                flush2(); buf = (y, m.group(2)); continue
        if buf: buf = (buf[0], buf[1] + " " + ln)
flush2()
# F2) "Events by years": era from the page's BC/AD marker; entries start with the year, later paragraphs inherit it
era = "BC"; prev_bc = None; prev_ad = 0
for n in range(89, 327):
    pg = page(n)
    head = pg.splitlines()[:6]
    for ln in head:
        mm = re.match(r"^(BC|AD)\b", ln.strip().replace(".", ""))
        if mm: era = mm.group(1); break
    year = None; chunk = []
    def fl():
        global chunk
        if year is not None and chunk: emit(-year if era == "BC" else year, 0, " ".join(chunk))
        chunk = []
    for ln in pg.splitlines():
        t = ln.strip()
        if not t or HEAD.search(t) or re.match(r"^(BC|AD)\.?$", t) or re.match(r"^\d{1,3}$", t): fl() if not t else None; continue
        t = re.sub(r"^(BC|AD)\s+(?=\S)", "", t.replace("BC.", "BC").replace("AD.", "AD"))
        m = re.match(r"^(\d{1,4})\s+(?=[A-Z])", t)
        if m and not re.match(r"^\d{1,2}\s", t) and not (int(m.group(1)) < 100 and era == "AD" and prev_ad > 300):
            fl(); cand = int(m.group(1)); chunk = [t[m.end():]]
            if era == "BC": okc = (prev_bc is None or (cand <= prev_bc and prev_bc - cand <= 2500)) and cand <= 6500
            else: okc = (cand >= prev_ad and (cand - prev_ad <= 300 or cand <= 1000)) and cand <= 2015
            if okc:
                year = cand
                if era == "BC": prev_bc = cand
                else: prev_ad = cand
            else:
                year = None; chunk = []
        else:
            if chunk and re.search(r"[.)]$", chunk[-1]) and t[:1].isupper() and sum(len(c) for c in chunk) > 70:
                fl()
            chunk.append(t)
    fl()

for y, t in [(1336, "The Vijayanagara Empire is founded by the Sangama dynasty, with its capital at Vijayanagara (Hampi, Karnataka)"),
             (1744, "The three Carnatic Wars leave the British East India Company dominant in southern India and remove the French rivals"),
             (1761, "Mysore under Hyder Ali and later his son Tipu fights wars with the Marathas, the Nizam of Hyderabad, Travancore and the British")]:
    add(y, 1763 if y == 1744 else None, t, "Q-files timeline of Indian history", "Timeline_of_Indian_history_-_Q-files.pdf")
REPAIR = {"Jawaharlal Nehru Prime Minister of In": "Jawaharlal Nehru becomes Prime Minister of India",
          "Atal Behari Vajpayee becomes Prime": "Atal Behari Vajpayee becomes Prime Minister",
          "hin Gangothri, India’s first permanent station at Antartica was set up": "Dakshin Gangotri, India’s first permanent research station in Antarctica, is set up",
          "Indian National Conference held in": "Indian National Conference held in Calcutta",
          "Sankaracharya and his philosophy of": None, "Reign of Rajaraja, the Great. Starts a": None}
# tidy: continuation lines are appended after add(), so re-clean and re-split here
_fixed = []
for ev in out:
    t = re.sub(r"\s+", " ", ev["t"])
    for part in t.split(" : "):
        for k, v in FIX.items(): part = part.replace(k, v)
        part = re.sub(r"(\w)- (\w)", r"\1\2", part).strip(" .-:;")
        part = re.sub(r"\ba a\b", "a", re.sub(r",(?=[A-Za-z])", ", ", part))
        if part in REPAIR:
            if REPAIR[part] is None: continue
            part = REPAIR[part]
        if 6 <= len(part) <= 300: _fixed.append({**ev, "t": part})
out = _fixed

# merge near-duplicates across files
stop = set("the of and a an in by to was were is as at on for with from his her its their this that"
           " reign establishment founded formation".split())
def toks(t): return {w for w in re.findall(r"[a-z]+", t.lower()) if w not in stop and len(w) > 2}
merged = []
for ev in sorted(out, key=lambda x: (x["s"], x["e"])):
    tk = toks(ev["t"]); hit = None
    for m in merged:
        if m["s"] == ev["s"] and m["e"] == ev["e"]:
            u = tk | m["_tk"]
            if u and len(tk & m["_tk"]) / len(u) >= 0.45: hit = m; break
    if hit:
        if ev["pub"] not in hit["pubs"]: hit["pubs"].append(ev["pub"])
        if len(ev["t"]) > len(hit["t"]) and ev["pub"] == hit["pubs"][0]: hit["t"] = ev["t"]
        if ev["d"] and not hit["d"]: hit["d"] = ev["d"]
    else:
        merged.append(dict(s=ev["s"], e=ev["e"], t=ev["t"], d=ev["d"], pubs=[ev["pub"]], _tk=tk))
final = [dict(s=m["s"], e=m["e"], t=m["t"], d=m["d"], p=m["pubs"]) for m in merged]
json.dump(final, open("data/events.json", "w"), ensure_ascii=False, separators=(",", ":"))
from collections import Counter
print("raw", len(out), "merged", len(final), Counter(len(x["p"]) for x in final))
print("years", min(x["s"] for x in final), max(x["s"] for x in final))
