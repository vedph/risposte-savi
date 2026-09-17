"""Diagnostic anchor alignment, explicitly not precision/recall against gold.

The 220 authored nuclei are a development reference (silver), not independently
reviewed labels. A trigger in an evidence span is only a retrieval hit: it does
not establish correct act boundaries, meaning, attribution or graph relations.
"""
import argparse
import json
from pathlib import Path
from opinion_extraction import extract_corpus
from qualified_opinions import build

ROOT = Path(__file__).resolve().parents[1]


def compare(automatic, reference):
    docs = []
    for doc in reference['documents']:
        if doc['source_status'] != 'current':
            continue
        frames = [f for d in automatic['documents'] if d['unit_id'] == doc['unit_id'] for f in d['frames']]
        rows = []
        for n in doc['nuclei']:
            eligible = any(q['source_field'] in ('text_diplomatic', 'text_annex') for q in n['evidence'])
            matches = []
            for f in frames:
                t = f['trigger']
                if any(t['source_field'] == q['source_field'] and t['source_sha256'] == q['source_sha256']
                       and q['span_start'] <= t['span_start'] and t['span_end'] <= q['span_end']
                       for q in n['evidence']):
                    matches.append(f['candidate_id'])
            rows.append(dict(nucleus_id=n['id'], eligible=eligible, anchor_hits=matches))
        docs.append(dict(unit_id=doc['unit_id'], nuclei=rows))
    eligible = [n for d in docs for n in d['nuclei'] if n['eligible']]
    return dict(reference_status='assistant_authored_silver_not_gold',
                interpretation='A trigger inside a cited passage is an anchor hit, not a correct interpretation. Counts are development diagnostics, not precision, recall, F1 or an independent test.',
                automatic_extractor=automatic['extractor'], automatic_rules_sha256=automatic['rules_sha256'],
                reference_sha256=reference['source_sha256'],
                summary=dict(eligible_nuclei=len(eligible), nuclei_with_anchor_hit=sum(bool(n['anchor_hits']) for n in eligible),
                             automatic_frames=automatic['summary']['frames']), documents=docs)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, help='Optional diagnostic JSON path')
    args = parser.parse_args()
    units = json.loads((ROOT / 'data/source/units.json').read_text())['units']
    result = compare(extract_corpus(units), build(units, ROOT / 'data/source/qualified_opinions.json'))
    body = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.write_text(body)
    else:
        print(body, end='')
