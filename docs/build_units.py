# -*- coding: utf-8 -*-
"""Build data/units.js (single source of truth for the site) from the canonical CSV,
attaching rule-extracted HYPOTHESES with provenance. Validated fields are never
overwritten by extraction output. Also writes data/hypotheses.csv (flat provenance table)."""
import csv, json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from extraction import extract

ED_PAT = re.compile(r"\[[^\[\]]{3,400}\]|\][^\[\]]{3,400}\[")
def split_editorial(t):
    """Isabella's inline editorial notes in square brackets -> separate field.
    Signature blocks were already parsed upstream; here we split for display+extraction."""
    notes = [m.group(0).strip("[] ").strip() for m in ED_PAT.finditer(t or "")]
    clean = ED_PAT.sub(" ", t or "")
    return re.sub(r"\s{2,}", " ", clean).strip(), notes

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data/reg142_units_v06.csv"

def title_short(subject):
    s = re.sub(r"\s+", " ", (subject or "")).strip()
    if not s: return "(no marginal note captured)"
    # a marginal note may break off inside an opening quotation (e.g. ...nipoti \u201cper la):
    # the title must not end mid-quote; cut before the unbalanced opening quote.
    if s.count("\u201c") > s.count("\u201d"):
        s = s[:s.rfind("\u201c")].rstrip(" ,.:;")
    FW = {"di","del","della","dello","dei","degli","delle","per","a","al","alla","ai",
          "agli","alle","e","et","che","in","con","su","da","dal","dalla","il","la",
          "lo","le","un","una","sopra","circa","o","li","de"}
    def fwtrim(x):
        """never end a title on a dangling function word"""
        toks = x.split(" ")
        while len(toks) > 3 and toks[-1].lower().strip(",.:;") in FW:
            toks.pop()
        return " ".join(toks).rstrip(" ,.:;")
    for sep in [" che ", " per il ", " per la ", " acciò", ";", " — ", " – "]:
        i = s.find(sep)
        if 18 < i < 56: return fwtrim(s[:i].rstrip(" ,."))
    if len(s) <= 58: return s
    cut = fwtrim(s[:58].rsplit(" ", 1)[0])
    return cut + "…"

def to_status(v):  # old-site vocabulary, kept for the interface
    return {"manual_full": "manual", "manual_partial": "manual_partial",
            "regest": "regest"}.get(v, "regest")

units, hyprows = [], []
with open(SRC, encoding="utf-8") as f:
    for r in csv.DictReader(f):
        uid = r["unit_id"]
        gt = r["text_diplomatic"]
        gt_clean, ed_notes = split_editorial(gt)
        subject = r["marginal_note_raw"]
        H = extract(gt_clean, subject)
        sig_src, _sig_notes = split_editorial(r["signatories_raw"])  # editorial remarks are not names
        ED_START = ("ab.", "absente", "assente", "di seguito", "mancherebbe", "manca", "seguono",
                    "a lato", "sono ", "vedi", "riviste", "negazioni", "ripristinando", "usciti")
        def _is_name(tok):
            t = tok.strip(" .;:")
            if not t or len(t) > 40: return False
            tl = t.lower()
            if tl.startswith(ED_START): return False
            if "\\" in t or "*" in t: return False           # illegibility marks are not names
            words = t.split()
            if len(words) >= 4 and t[0].islower(): return False  # sentence fragment
            if len(words) == 1 and len(t) < 8 and "°" not in t: return False  # stray given name
            return any(c.isupper() for c in t)
        sigs = [w.strip() for w in re.split(r"[;,]| et ", sig_src)]
        sigs = [re.sub(r"\s+", " ", w) for w in sigs if _is_name(w)]
        u = dict(
            unit_id=uid, register_id="ASVe_CSM_R142", register_number=142,
            folio_raw=r["folio_raw"], folio_start=r["folio_start"], folio_end=r["folio_end"],
            folio_sides=r["folio_sides"].split(),
            date_original=r["date_original"], date_iso=r["date_iso"],
            date_precision=r["date_precision"],
            more_veneto=(r["date_calendar"] == "more_veneto"),
            date_check=r["date_check"],
            title_short=title_short(subject),
            marginal_note_raw=subject,
            transcription_status=to_status(r["transcription_status"]),
            text_diplomatic=gt, editorial_notes=ed_notes, regest_note=r["regest_note"],
            htr_text=r["htr_text"], htr_coverage=r["htr_coverage"],
            htr_missing=r["htr_pages_missing"],
            cer=(float(r["cer_vs_ground_truth"]) if r["cer_vs_ground_truth"] else None),
            wer=(float(r["wer_vs_ground_truth"]) if r["wer_vs_ground_truth"] else None),
            eval_note=r["eval_excluded_reason"],
            reliability=(r["reading_reliability"] or "F")[0],
            relation_type=(r["relation_type"] or "none"),
            related_unit_id=r["related_unit_id"], relation_source=r["relation_source"],
            signatories_raw=r["signatories_raw"],
            signatories=sigs,
            signatory_count=(int(r["signatory_count"]) if r["signatory_count"] else None),
            signatory_status=r["signatory_status"], signatory_source=r["signatory_source"],
            field_flags=(r["field_flags"].split("|") if r["field_flags"] else []),
            source_reference="ASVe, Cinque Savi alla Mercanzia, Risposte, reg. 142, " + r["folio_raw"],
            # ---- hypotheses (never ground truth) ----
            hyp=dict(
                policy_domain=H["policy_domain_hyp"],
                decision_orientation=H["decision_orientation_hyp"],
                document_trigger=H["document_trigger_hyp"]),
            terms=dict(
                deontic=[dict(t=x["term"], ev=x["ev"]) for x in H["deontic"][:12]],
                fiscal=[dict(t=x["term"], ev=x["ev"]) for x in H["fiscal"][:12]],
                monetary=[dict(t=x["term"], ev=x["ev"]) for x in H["monetary"][:12]],
                institutions=[dict(t=x["term"], ev=x["ev"]) for x in H["institutions"][:10]]),
            persons_hyp=H["persons_hyp"][:8],
            places=H["places_hyp"],
        )
        units.append(u)
        # flat provenance table
        def row(field, value, rule, ev, conf=""):
            hyprows.append([uid, field, value, rule, conf, (ev or "").replace("\n", " ")])
        for x in H["deontic"]: row("deontic_formula", x["term"], x["rule"], x["ev"])
        for x in H["fiscal"]: row("fiscal_term", x["term"], x["rule"], x["ev"])
        for x in H["monetary"]: row("monetary_expression", x["term"], x["rule"], x["ev"])
        for x in H["institutions"]: row("institutional_term", x["term"], x["rule"], x["ev"])
        if H["decision_orientation_hyp"]:
            d = H["decision_orientation_hyp"]
            row("decision_orientation", d["value"], d["rule"], d["formula"]["ev"], d["confidence"])
        if H["policy_domain_hyp"]:
            d = H["policy_domain_hyp"]
            row("policy_domain", d["value"], d["rule"], "cue: " + str(d.get("cue")), d["confidence"])
        if H["document_trigger_hyp"]:
            d = H["document_trigger_hyp"]
            row("document_trigger", d["value"], d["rule"], d.get("ev", ""), d["confidence"])
        for p in H["persons_hyp"]: row("person", p["name"], p["rule"], p["ev"])
        for p in H["places_hyp"]: row("place", p["name"], p["rule"], p["ev"])

meta = dict(version="dataset-2026-07-02", generated="2026-07-02",
            n_units=len(units),
            n_manual=sum(1 for u in units if u["transcription_status"].startswith("manual")),
            n_sides_htr=304, corpus_cer=0.0977, corpus_wer=0.2825, n_eval=27,
            pipeline_cer=0.15, pipeline_seg_err=0.03)

payload = json.dumps(dict(register="ASVe, Cinque Savi alla Mercanzia, Risposte, reg. 142 (1607-1610)",
                          meta=meta, units=units), ensure_ascii=False).replace("</", "<\\/")
(ROOT / "data/units.json").write_text(json.dumps(dict(register="ASVe, Cinque Savi alla Mercanzia, Risposte, reg. 142 (1607-1610)", meta=meta, units=units), ensure_ascii=False, indent=1), encoding="utf-8")
(ROOT / "data/units.js").write_text(
    "// Canonical data for the Risposte interface — GENERATED by tools/build_units.py.\n"
    "// Edit the CSV + rerun; do not edit this file by hand. Hypotheses carry provenance\n"
    "// and are pending expert validation; they never replace validated fields.\n"
    "var RISPOSTE=" + payload + ";", encoding="utf-8")

with open(ROOT / "data/hypotheses.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["unit_id", "field", "value", "rule_id", "confidence", "evidence"])
    w.writerows(hyprows)

# ---- stats ----
from collections import Counter
cd = Counter(u["hyp"]["decision_orientation"]["value"] for u in units if u["hyp"]["decision_orientation"])
cp = Counter(u["hyp"]["policy_domain"]["value"] for u in units if u["hyp"]["policy_domain"])
ct = Counter(u["hyp"]["document_trigger"]["value"] for u in units if u["hyp"]["document_trigger"])
npers = sum(len(u["persons_hyp"]) for u in units)
npl = sum(len(u["places"]) for u in units)
print("units:", len(units), "| hyp rows:", len(hyprows))
print("orientation hyp:", dict(cd))
print("domain hyp:", dict(cp.most_common()))
print("trigger hyp:", dict(ct))
print("persons_hyp:", npers, "| places:", npl,
      "| units.js KB:", round((ROOT/'data/units.js').stat().st_size/1024))
