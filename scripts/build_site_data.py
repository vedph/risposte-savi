#!/usr/bin/env python3
"""Generate docs/data.js from the released CSVs and copy them into docs/data/.
data.js keeps the site functional over file:// and on GitHub Pages alike."""
import csv, json, shutil

units, gaps = [], []
for r in csv.DictReader(open("data/documentary.csv", encoding="utf-8")):
    (gaps if r["unit_id"].startswith("R142_G") else units).append(r)
ana = {r["unit_id"]: r for r in csv.DictReader(open("data/analytical.csv", encoding="utf-8"))}
meta = {
    "units": len(units), "gap_rows": len(gaps),
    "words": sum(len(u["text_diplomatic"].split()) for u in units),
    "coverage_reconstructed": "≈46%", "coverage_v05_sheet": "≈53%",
    "build": "0.5.1-reconstructed · 2 July 2026",
}
out = {"meta": meta, "units": units, "gaps": gaps, "analytical": ana}
with open("docs/data.js", "w", encoding="utf-8") as fh:
    fh.write("window.RISPOSTE = ")
    json.dump(out, fh, ensure_ascii=False)
    fh.write(";")
for f in ("documentary.csv","analytical.csv","PROVENANCE.md","SCHEMA.md"):
    shutil.copy(f"data/{f}", f"docs/data/{f}")
print("data.js", meta)
