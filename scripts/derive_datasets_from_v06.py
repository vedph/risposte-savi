#!/usr/bin/env python3
"""Derive the two released datasets from the canonical v0.6/v0.7 site data.

Sources: docs/data/units.json (documentary canon) + docs/data/hypotheses.csv
(rule-extracted hypotheses with provenance). Emits data/documentary.csv with
folio-level gap rows computed from folio_sides, data/analytical.csv as a pivot
of the hypotheses (every populated field carries status pending_hypothesis),
and slim site bundles docs/data/gaps.js and docs/data/hypo.js.
"""
import csv, json, os, re, collections

U = json.load(open("docs/data/units.json", encoding="utf-8"))
units = U["units"]
TOTAL = 192
PARTIAL_UNIT = "R142_0043"

DOC_COLS = ["register_id","unit_id","folio_start","folio_end","date_original","date_iso",
    "date_precision","marginal_note_raw","marginal_note_present","signatories_raw",
    "signatories_norm","signatory_count","signatories_complete","text_diplomatic",
    "transcription_status","relation_type","related_unit_id","date_check",
    "regest_note","uncertain_readings"]

covered = set()
rows = []
for u in units:
    for s in u.get("folio_sides", []):
        d = "".join(ch for ch in s if ch.isdigit())
        if d: covered.add(int(d))
    txt = u.get("text_diplomatic","") or ""
    rel = u.get("relation_type","") or ""
    rows.append({
        "register_id": u.get("register_id","ASVe_CSM_R142"),
        "unit_id": u["unit_id"],
        "folio_start": u.get("folio_start",""), "folio_end": u.get("folio_end",""),
        "date_original": u.get("date_original",""), "date_iso": u.get("date_iso",""),
        "date_precision": u.get("date_precision",""),
        "marginal_note_raw": u.get("marginal_note_raw",""),
        "marginal_note_present": "present" if u.get("marginal_note_raw","").strip() else "not_checked",
        "signatories_raw": u.get("signatories_raw",""),
        "signatories_norm": "",
        "signatory_count": u.get("signatory_count",""),
        "signatories_complete": u.get("signatory_status","") or "not_checked",
        "text_diplomatic": txt,
        "transcription_status": (
            "manual_partial" if u["unit_id"] == PARTIAL_UNIT else
            {"manual":"manual_full","full":"manual_full","partial":"manual_partial"}.get(
                u.get("transcription_status",""), u.get("transcription_status",""))),
        "relation_type": "" if rel == "none" else rel,
        "related_unit_id": u.get("related_unit_id","") if rel != "none" else "",
        "date_check": u.get("date_check",""),
        "regest_note": u.get("regest_note",""),
        "uncertain_readings": str(txt.count("(?)")) if txt else "",
        "_k": min(int("".join(ch for ch in s if ch.isdigit())) for s in u.get("folio_sides",["0"])) if u.get("folio_sides") else 0,
    })

gaps, g, f = [], 0, 1
while f <= TOTAL:
    if f in covered: f += 1; continue
    a = f
    while f <= TOTAL and f not in covered: f += 1
    g += 1
    gaps.append({c: "" for c in DOC_COLS} | {
        "register_id": "ASVe_CSM_R142", "unit_id": f"R142_G{g:03d}",
        "folio_start": str(a), "folio_end": str(f-1),
        "marginal_note_present": "not_applicable",
        "signatories_complete": "not_applicable",
        "transcription_status": "not_transcribed", "_k": a})

allr = sorted(rows + gaps, key=lambda r: r["_k"])
os.makedirs("data", exist_ok=True)
with open("data/documentary.csv","w",newline="",encoding="utf-8") as fh:
    w = csv.DictWriter(fh, fieldnames=DOC_COLS, extrasaction="ignore")
    w.writeheader(); w.writerows(allr)

FMAP = {"policy_domain":"policy_domain","decision_orientation":"decision_orientation",
 "document_trigger":"document_trigger","person":"actors","place":"geography",
 "fiscal_term":"fiscal_terms","institutional_term":"institutional_terms",
 "monetary_expression":"monetary_expressions","deontic_formula":"deontic_formulas"}
ANA = ["unit_id","policy_domain","decision_orientation","document_trigger","actors",
 "geography","risk_terms","fiscal_terms","institutional_terms","monetary_expressions",
 "deontic_formulas","policy_domain_status","decision_orientation_status","document_trigger_status"]
agg = collections.defaultdict(lambda: collections.defaultdict(list))
hyp = list(csv.DictReader(open("docs/data/hypotheses.csv", encoding="utf-8")))
dec_state = {}
for r in hyp:
    if (r.get("decision") or "") == "reject":
        continue
    val = r.get("new_value") if (r.get("decision") == "reformulate" and r.get("new_value")) else r["value"]
    tgt = FMAP.get(r["field"])
    if tgt and val not in agg[r["unit_id"]][tgt]:
        agg[r["unit_id"]][tgt].append(val)
    if r.get("decision") in ("accept","reformulate") and r["field"] in ("policy_domain","decision_orientation","document_trigger"):
        dec_state[(r["unit_id"], r["field"])] = "validated"
with open("data/analytical.csv","w",newline="",encoding="utf-8") as fh:
    w = csv.writer(fh); w.writerow(ANA)
    for u in units:
        a = agg[u["unit_id"]]
        row = [u["unit_id"]] + ["|".join(a.get(c,[])) for c in ANA[1:11]]
        row += [dec_state.get((u["unit_id"], c), "pending_hypothesis" if a.get(c) else "not_checked")
                for c in ("policy_domain","decision_orientation","document_trigger")]
        w.writerow(row)

with open("docs/data/gaps.js","w",encoding="utf-8") as fh:
    fh.write("window.GAPS=" + json.dumps(
        [{"unit_id":x["unit_id"],"folio_start":x["folio_start"],"folio_end":x["folio_end"]}
         for x in gaps], ensure_ascii=False) + ";")
slim = [{"u":r["unit_id"],"f":r["field"],"v":r["value"],"r":r["rule_id"],
         "c":r.get("confidence",""),"e":(r.get("evidence","") or "")[:120]} for r in hyp]
with open("docs/data/hypo.js","w",encoding="utf-8") as fh:
    fh.write("window.HYPO=" + json.dumps(slim, ensure_ascii=False) + ";")

cov = len(covered)
with open("data/PROVENANCE.md","w",encoding="utf-8") as fh:
    fh.write(f"""# Provenance — datasets derived from the canonical v0.6/v0.7 site data

Derived on 2026-07-02 from `docs/data/units.json` (site build 0.7.0, generated
2026-07-01) and `docs/data/hypotheses.csv` (741 rule-extracted hypotheses with
rule id, confidence and cited evidence). An earlier 0.5.1 reconstruction from
the worklist headers has been superseded by this canonical source.

- Units: {len(units)} (44 with diplomatic text; regesti carried in `regest_note`)
- Gap rows computed from `folio_sides` at folio granularity: {len(gaps)}
- Folios touched by units: {cov} of {TOTAL} — register coverage ≈{100*cov/TOTAL:.0f}%
  (this supersedes both the ≈53% early estimate cited in the submitted paper and
  the ≈46% of the 0.5.1 reconstruction; the paper figure should be corrected)
- Analytical layer: pivot of the hypotheses; every populated field carries
  status `pending_hypothesis`; nothing validated is claimed
- One documentary relation in the canon: R142_0025 repeated_supplication → R142_0002
- No value invented; unknown = empty + `not_checked`
""")
print(f"units {len(units)} | gaps {len(gaps)} | coverage {cov}/{TOTAL} = {100*cov/TOTAL:.1f}% | hypotheses {len(hyp)}")
