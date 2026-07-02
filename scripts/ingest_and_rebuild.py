#!/usr/bin/env python3
"""Ingest work packets and ATR drops from incoming/, apply them to the canonical
data, regenerate every derived artefact, validate. Run by the GitHub Action on
every push touching incoming/; can be run locally too."""
import csv, json, glob, os, shutil, subprocess, sys, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
UJ = "docs/data/units.json"
HY = "docs/data/hypotheses.csv"
stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
changed = False

U = json.load(open(UJ, encoding="utf-8"))
units = {u["unit_id"]: u for u in U["units"]}

def sides(fs, fe):
    out, seen = [], set()
    for tok in [fs, fe or fs]:
        n = "".join(c for c in tok if c.isdigit()); s = tok[-1] if tok and tok[-1] in "rv" else ""
        if not n: continue
        a = int(n)
        for side in ([s] if s else ["r","v"]):
            k = f"{a}{side}"
            if k not in seen: seen.add(k); out.append(k)
    if fs and fe:
        n1 = int("".join(c for c in fs if c.isdigit()) or 0); n2 = int("".join(c for c in fe if c.isdigit()) or 0)
        for a in range(n1, n2+1):
            for side in "rv":
                k = f"{a}{side}"
                if k not in seen: seen.add(k); out.append(k)
    return sorted(out, key=lambda x:(int("".join(c for c in x if c.isdigit())), x[-1]))

# ---- pacchetti di lavoro (review.html) ----
for f in sorted(glob.glob("incoming/*.json")):
    pkg = json.load(open(f, encoding="utf-8")); changed = True
    for uid, txt in (pkg.get("transcriptions") or {}).items():
        u = units.get(uid)
        if not u: continue
        if u.get("transcription_status") == "regest" and txt.strip() and txt.strip() != (u.get("regest_note") or "").strip():
            u["text_diplomatic"] = txt; u["transcription_status"] = "manual_full"
        elif u.get("transcription_status") == "regest":
            u["regest_note"] = txt
        else:
            u["text_diplomatic"] = txt
    for n in pkg.get("new_units") or []:
        uid = n["unit_id"]
        if uid in units: continue
        st = n.get("transcription_status","manual_full")
        nu = {"unit_id": uid, "register_id": "ASVe_CSM_R142", "register_number": 142,
              "folio_raw": n.get("folio_start",""), "folio_start": n.get("folio_start",""),
              "folio_end": n.get("folio_end","") or n.get("folio_start",""),
              "folio_sides": sides(n.get("folio_start",""), n.get("folio_end","")),
              "date_original": n.get("date_original",""), "date_iso": "", "date_precision": "",
              "more_veneto": False, "date_check": "", "title_short": (n.get("marginal_note_raw","") or "")[:60],
              "marginal_note_raw": n.get("marginal_note_raw",""), "transcription_status": st,
              "text_diplomatic": n.get("text","") if st != "regest" else "",
              "regest_note": n.get("text","") if st == "regest" else "",
              "htr_text": "", "signatories_raw": "", "signatory_count": None,
              "signatory_status": "not_checked", "relation_type": "none", "related_unit_id": "",
              "editorial_notes": []}
        U["units"].append(nu); units[uid] = nu
    if pkg.get("validations"):
        rows = list(csv.DictReader(open(HY, encoding="utf-8")))
        for r in rows: r.setdefault("decision",""); r.setdefault("new_value","")
        for v in pkg["validations"]:
            for r in rows:
                if r["unit_id"]==v["unit_id"] and r["field"]==v["field"] and r["value"]==v["value"]:
                    r["decision"] = v["decision"]; r["new_value"] = v.get("new_value","")
        cols = list(rows[0].keys())
        with open(HY,"w",newline="",encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=cols); w.writeheader(); w.writerows(rows)
    os.makedirs("incoming/processed", exist_ok=True)
    shutil.move(f, f"incoming/processed/{stamp}_{os.path.basename(f)}")

# ---- lotti ATR di Boschetti: incoming/atr/*.csv (unit_id,htr_text,cer,wer) ----
for f in sorted(glob.glob("incoming/atr/*.csv")):
    changed = True
    for r in csv.DictReader(open(f, encoding="utf-8")):
        u = units.get(r["unit_id"])
        if not u: continue
        if r.get("htr_text"): u["htr_text"] = r["htr_text"]
        if r.get("cer"): u["cer"] = float(r["cer"])
        if r.get("wer"): u["wer"] = float(r["wer"])
    os.makedirs("incoming/processed", exist_ok=True)
    shutil.move(f, f"incoming/processed/{stamp}_{os.path.basename(f)}")

if not changed:
    print("niente in incoming/: nulla da fare"); sys.exit(0)

U["meta"]["generated"] = datetime.date.today().isoformat()
U["meta"]["n_units"] = len(U["units"])
json.dump(U, open(UJ,"w",encoding="utf-8"), ensure_ascii=False)
with open("docs/data/units.js","w",encoding="utf-8") as fh:
    fh.write("// GENERATED - do not edit by hand\nvar RISPOSTE=")
    json.dump(U, fh, ensure_ascii=False); fh.write(";")

subprocess.run([sys.executable, "scripts/derive_datasets_from_v06.py"], check=True)
for x in ("documentary.csv","analytical.csv","PROVENANCE.md","SCHEMA.md"):
    shutil.copy(f"data/{x}", f"docs/data/{x}")
subprocess.run([sys.executable, "scripts/validate_datasets.py"], check=True)
print("ingest completo: dataset e sito rigenerati")
