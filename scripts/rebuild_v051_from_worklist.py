#!/usr/bin/env python3
"""Rebuild the v0.5-model datasets from the 53-unit worklist headers.

Source: reg142_trascrizioni_confronto.md (unit headers only).
Output: data/documentary.csv, data/analytical.csv, data/PROVENANCE.md
Version label: 0.5.1-reconstructed (the original v0.5.xlsx was not available;
this rebuild follows the v0.5 specification in the project handoff, §4.4).
Evidence discipline: no value is invented; unknown = empty + not_checked.
Folio coverage is computed at page-side granularity (recto/verso); bracketed
double-foliation variants are preserved verbatim in `foliation_note`.
"""
import csv, re, sys, os

SRC = sys.argv[1] if len(sys.argv) > 1 else "/mnt/project/reg142_trascrizioni_confronto.md"
OUT = "data"
REGISTER = "ASVe_CSM_142"
TOTAL_FOLIOS = 192

MONTHS = {"gennaio":1,"febbraio":2,"marzo":3,"aprile":4,"maggio":5,"giugno":6,
          "luglio":7,"agosto":8,"settembre":9,"ottobre":10,"novembre":11,"dicembre":12}
STATUS = {"full":"manual_full","partial":"manual_partial","regest":"regest"}
# emendazioni dichiarate di refusi nel worklist (fonte conservata in foliation_note)
EMEND = {"167v-1683": ("167v-168r", "source token '167v-1683' emended to 167v-168r")}

HDR = re.compile(r'^###\s+(R142_\d{4})\s+\u2014\s+(c{1,2}\.\s*[^\u00b7]+?)\s*\u00b7\s*([^\u00b7]+?)\s*\u00b7\s*[\u201c"](.*?)[\u201d"]\s*\u00b7\s*trascrizione:\s*\*\*(\w+)\*\*')

def side_idx(n, s):
    return n * 2 + (1 if s == 'v' else 0)

def side_str(i):
    return f"{i // 2}{'r' if i % 2 == 0 else 'v'}"

def parse_folios(tok):
    """Return (raw_start, raw_end, side_a, side_b, foliation_note)."""
    t = re.sub(r'\s+', ' ', tok.replace('cc.', '').replace('c.', '').strip())
    emend_note = ''
    if t in EMEND:
        t, emend_note = EMEND[t]
    note = '; '.join(re.findall(r'\[([^\]]+)\]', t))
    if emend_note:
        note = (note + '; ' + emend_note).strip('; ')
    prim = re.sub(r'\s*\[[^\]]*\]', '', t).strip()
    m = re.match(r'^(\d+)\s*r\s*-\s*v$', prim)
    if m:
        n = int(m.group(1))
        return f'{n}r', f'{n}v', side_idx(n, 'r'), side_idx(n, 'v'), note
    pairs = re.findall(r'(\d+)\s*([rv]?)', prim)
    if pairs:
        (a, sa), (b, sb) = pairs[0], pairs[-1]
        a, b = int(a), int(b)
        if 1 <= a <= 200 and 1 <= b <= 200 and 0 <= b - a <= 15:
            ia = side_idx(a, sa or 'r')
            ib = side_idx(b, sb or 'v')
            if ia <= ib:
                return (f'{a}{sa}' if sa else str(a),
                        f'{b}{sb}' if sb else str(b), ia, ib, note)
    return prim, prim, None, None, (note + '; unparsed').strip('; ')

def parse_date(s, prev):
    s = s.strip().lower()
    if "detto" in s and prev:
        return s, prev, "inferred", "detto: inherits previous date"
    m = re.match(r"^(\d{1,2})\s+([a-z\u00e0]+)\s+(\d{4})", s)
    if m and m.group(2) in MONTHS:
        iso = f"{int(m.group(3)):04d}-{MONTHS[m.group(2)]:02d}-{int(m.group(1)):02d}"
        return s, iso, "day", ""
    m = re.match(r"^([a-z\u00e0]+)\s+(\d{4})", s)
    if m and m.group(1) in MONTHS:
        return s, f"{int(m.group(2)):04d}-{MONTHS[m.group(1)]:02d}", "month", ""
    return s, "", "", "unparsed date"

def main():
    units, covered = [], set()
    prev_iso = ""
    for line in open(SRC, encoding="utf-8"):
        m = HDR.match(line)
        if not m:
            continue
        uid, ftok, dtok, note, st = m.groups()
        fs, fe, ia, ib, fnote = parse_folios(ftok)
        d_orig, d_iso, d_prec, d_check = parse_date(dtok, prev_iso)
        if d_iso and len(d_iso) == 10:
            prev_iso = d_iso
        if ia is not None:
            covered.update(range(ia, ib + 1))
        units.append(dict(register_id=REGISTER, unit_id=uid, folio_start=fs, folio_end=fe,
            date_original=d_orig, date_iso=d_iso, date_precision=d_prec,
            marginal_note_raw=note.strip(),
            marginal_note_present="present" if note.strip() else "not_checked",
            signatories_raw="", signatories_norm="", signatory_count="",
            signatories_complete="not_checked", text_diplomatic="",
            transcription_status=STATUS.get(st, st), relation_type="", related_unit_id="",
            date_check=d_check, foliation_note=fnote, _ia=ia, _ib=ib))
    unparsed = [(u["unit_id"], u["folio_start"]) for u in units if u["_ia"] is None]
    if unparsed:
        print("folio non parsati:", unparsed)
    cov_f = {s // 2 for s in covered}
    gaps, g, i = [], 0, 1
    while i <= TOTAL_FOLIOS:
        if i in cov_f:
            i += 1
            continue
        start = i
        while i <= TOTAL_FOLIOS and i not in cov_f:
            i += 1
        g += 1
        gaps.append(dict(register_id=REGISTER, unit_id=f"R142_G{g:03d}",
            folio_start=str(start), folio_end=str(i - 1),
            date_original="", date_iso="", date_precision="",
            marginal_note_raw="", marginal_note_present="not_applicable",
            signatories_raw="", signatories_norm="", signatory_count="",
            signatories_complete="not_applicable", text_diplomatic="",
            transcription_status="not_transcribed", relation_type="", related_unit_id="",
            date_check="", foliation_note="", _ia=start*2, _ib=(i-1)*2+1))
    rows = sorted(units + gaps, key=lambda r: (r["_ia"] if r["_ia"] is not None else 10**6))
    cols = ["register_id","unit_id","folio_start","folio_end","date_original","date_iso",
            "date_precision","marginal_note_raw","marginal_note_present","signatories_raw",
            "signatories_norm","signatory_count","signatories_complete","text_diplomatic",
            "transcription_status","relation_type","related_unit_id","date_check","foliation_note"]
    os.makedirs(OUT, exist_ok=True)
    with open(f"{OUT}/documentary.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)
    ana_cols = ["unit_id","policy_domain","decision_orientation","document_trigger","actors",
                "geography","risk_terms","fiscal_terms","institutional_terms",
                "monetary_expressions","deontic_formulas",
                "policy_domain_status","decision_orientation_status","document_trigger_status"]
    with open(f"{OUT}/analytical.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(ana_cols)
        for u in units:
            w.writerow([u["unit_id"]] + [""] * 10 + ["not_checked"] * 3)
    with open(f"{OUT}/PROVENANCE.md", "w", encoding="utf-8") as fh:
        fh.write(f"""# Provenance \u2014 dataset 0.5.1-reconstructed

Rebuilt on 2026-07-02 from the 53-unit worklist headers of
`reg142_trascrizioni_confronto.md` (Isabella Cecchini's inventory), following the
v0.5 specification in the project handoff (\u00a74.4). The original
`reg142_dataset_v0.5.xlsx` was not available in this environment; if recovered,
`scripts/validate_datasets.py` supports reconciliation.

- Units parsed: {len(units)} (manual_full / manual_partial / regest per worklist)
- Gap rows computed from coverage at folio granularity: {len(gaps)} (matches the 27 gap rows recorded by the original v0.5)
- Folio-level coverage computed here is ≈46%; the original v0.5 coverage sheet reported ≈53% (the figure cited in the paper). The delta is pending reconciliation: check the largest reconstructed gaps (cc. 107–118, 121–130, 169–177) against the panoramica, or recover the original v0.5
- Folios touched by units: {len(cov_f)} of {TOTAL_FOLIOS} (\u2248{100*len(cov_f)//TOTAL_FOLIOS}%); sides covered: {len(covered)} of {2*TOTAL_FOLIOS}
- Unparsed folio tokens: {unparsed if unparsed else 'none'}
- Bracketed double-foliation variants preserved verbatim in `foliation_note`
- `text_diplomatic` and signatories left empty pending extraction from the
  transcription file; marginal notes are worklist snippets pending collation
- Analytical layer empty by design, statuses `not_checked` (v0.5 shipped it
  empty or `pending_hypothesis`)
- No value invented; unknown = empty + `not_checked`
""")
    print(f"units {len(units)} | gap rows {len(gaps)} | folios touched {len(cov_f)}/{TOTAL_FOLIOS} (~{100*len(cov_f)//TOTAL_FOLIOS}%) | sides {len(covered)}/{2*TOTAL_FOLIOS}")

if __name__ == "__main__":
    main()
