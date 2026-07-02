#!/usr/bin/env python3
"""Phase B: fill text_diplomatic from Isabella's column of the comparison file.

Joins the numbered clause segments of the 'Isabella (ground truth)' column into
continuous prose per unit, preserving her editorial marks verbatim
([sic], (?), **...**, [a lato: ...]). Adds `uncertain_readings` = count of '(?)'.
No text is invented; units without segments stay empty.
"""
import csv, re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else "/mnt/project/reg142_trascrizioni_confronto.md"
CSV = "data/documentary.csv"

def main():
    text = open(SRC, encoding="utf-8").read()
    blocks = re.split(r'(?m)^### (R142_\d{4})', text)
    unit_text = {}
    for i in range(1, len(blocks), 2):
        uid, body = blocks[i], blocks[i+1]
        segs = []
        for line in body.splitlines():
            m = re.match(r'^\|\s*\d+\s*\|(.*)$', line)
            if not m:
                continue
            cells = [c.strip() for c in m.group(1).split('|')]
            if cells and cells[0]:
                segs.append(cells[0])
        if segs:
            t = re.sub(r'\s+', ' ', ' '.join(segs)).strip()
            unit_text[uid] = t
    rows = list(csv.DictReader(open(CSV, encoding="utf-8")))
    cols = list(rows[0].keys())
    if "uncertain_readings" not in cols:
        cols.append("uncertain_readings")
    filled = words = 0
    for r in rows:
        uid = r["unit_id"]
        if uid in unit_text:
            r["text_diplomatic"] = unit_text[uid]
            r["uncertain_readings"] = str(unit_text[uid].count("(?)"))
            filled += 1
            words += len(unit_text[uid].split())
        else:
            r.setdefault("uncertain_readings", "")
    with open(CSV, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    empty_units = [r["unit_id"] for r in rows
                   if r["unit_id"].startswith("R142_0") and not r["text_diplomatic"]]
    with open("data/PROVENANCE.md", "a", encoding="utf-8") as fh:
        fh.write(f"""
## Phase B (2026-07-02)

`text_diplomatic` filled for {filled} units ({words} words) from the Isabella
column of `reg142_trascrizioni_confronto.md`; editorial marks preserved
verbatim. `uncertain_readings` counts the '(?)' marks per unit. Units without
segments in the source remain empty: {empty_units if empty_units else 'none'}.
Signatories remain `not_checked` (not extracted in this phase).
""")
    print(f"filled {filled} units | {words} parole | senza testo: {empty_units if empty_units else 'nessuna'}")

if __name__ == "__main__":
    main()
