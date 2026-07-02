#!/usr/bin/env python3
"""Validate the released datasets against the model declared in the paper (§2).

Usage: python scripts/validate_datasets.py  (run from repository root)
Checks: required columns; unit_id uniqueness and join integrity; typed-link
targets; controlled-vocabulary membership (composite `|` values allowed for
decision_orientation); uncertainty states; date_iso shape. Errors exit 1.
"""
import csv, re, sys, os

DOC_REQ = ["register_id","unit_id","folio_start","folio_end","date_original","date_iso",
           "date_precision","marginal_note_raw","marginal_note_present","signatories_raw",
           "signatories_norm","signatory_count","signatories_complete","text_diplomatic",
           "transcription_status","relation_type","related_unit_id"]
ANA_REQ = ["unit_id","policy_domain","decision_orientation","document_trigger","actors",
           "geography","risk_terms","fiscal_terms","institutional_terms",
           "monetary_expressions","deontic_formulas"]
UNCERT = {"present","absent","not_visible","not_transcribed","not_checked","uncertain","not_applicable","pending_hypothesis","validated"}
TSTATUS = {"manual_full","manual_partial","regest","not_transcribed","htr_raw","htr_aligned","reviewed","llm_scaffold_non_ground_truth"}
RELTYPES = {"dissent_to","continuation_of","repeated_supplication","copy_of","same_dossier_as","response_to","correction_of",""}

def vocab(name):
    p = os.path.join("data","vocabularies",f"{name}.csv")
    with open(p, encoding="utf-8") as f:
        return {r[0].strip() for r in list(csv.reader(f))[1:] if r}

def rows(path):
    with open(path, encoding="utf-8") as f:
        return list(csv.DictReader(f))

def main():
    errors, warnings = [], []
    doc = rows(os.path.join("data","documentary.csv"))
    ana = rows(os.path.join("data","analytical.csv"))
    for req, got, name in ((DOC_REQ, doc[0].keys() if doc else [], "documentary"),
                            (ANA_REQ, ana[0].keys() if ana else [], "analytical")):
        missing = [c for c in req if c not in got]
        if missing: errors.append(f"{name}.csv: missing columns {missing}")
    ids = [r.get("unit_id","") for r in doc]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup: errors.append(f"documentary: duplicate unit_id {sorted(dup)[:5]}")
    idset = set(ids)
    for r in doc:
        rt, tgt = r.get("relation_type","").strip(), r.get("related_unit_id","").strip()
        if rt and rt not in RELTYPES: warnings.append(f"{r['unit_id']}: relation_type '{rt}' outside convention")
        if rt and rt in {"dissent_to","continuation_of"} and tgt not in idset:
            errors.append(f"{r['unit_id']}: related_unit_id '{tgt}' not found")
        ts = r.get("transcription_status","").strip()
        if ts and ts not in TSTATUS: warnings.append(f"{r['unit_id']}: transcription_status '{ts}'")
        di = r.get("date_iso","").strip()
        if di and not re.fullmatch(r"\d{4}(-\d{2}(-\d{2})?)?", di):
            warnings.append(f"{r['unit_id']}: date_iso '{di}' not ISO-shaped")
        mp = r.get("marginal_note_present","").strip()
        if mp and mp not in UNCERT: warnings.append(f"{r['unit_id']}: marginal_note_present '{mp}'")
    vocs = {k: vocab(k) for k in ("policy_domain","decision_orientation","document_trigger")}
    for r in ana:
        uid = r.get("unit_id","?")
        if uid not in idset: errors.append(f"analytical: unit_id '{uid}' absent from documentary")
        for field, vset in vocs.items():
            val = r.get(field,"").strip()
            if not val: continue
            parts = [p.strip() for p in val.split("|")] if field == "decision_orientation" else [val]
            parts = [p.strip() for p in val.split("|")]
            for p in parts:
                if p and p not in vset: warnings.append(f"{uid}: {field} value '{p}' not in vocabulary")
        for col, val in r.items():
            if col.endswith("_status") and val.strip() and val.strip() not in UNCERT:
                warnings.append(f"{uid}: {col} '{val}' not an uncertainty state")
    gap = sum(1 for r in doc if r.get("transcription_status","").strip() == "not_transcribed")
    print(f"documentary rows: {len(doc)}  (of which gap rows: {gap})")
    print(f"analytical rows:  {len(ana)}")
    for w in warnings[:40]: print("WARN ", w)
    if len(warnings) > 40: print(f"... and {len(warnings)-40} more warnings")
    for e in errors: print("ERROR", e)
    print(f"\n{len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1 if errors else 0)

if __name__ == "__main__":
    main()
