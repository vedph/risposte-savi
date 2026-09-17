#!/usr/bin/env python3
"""Validate incoming packets, prepare the entire release, then commit and archive.

Packets: incoming/*.json; ATR: incoming/atr/*.csv. See CONTRIBUTING.md.
Source text changes supersede derived hypotheses pending a new extraction/review.
"""
import argparse
import copy
import datetime as dt
import hashlib
import json
from pathlib import Path
from pipeline import ROOT, HYP_COLS, TSTATUS, csv_bytes, derive, folio_sides, json_bytes, load_sources, normalize_hyp, publish, read_csv
from review_packets import ANCHOR_COLUMNS, finite_metric, hypothesis_key, validate_anchor, validate_packet_shape


def ingest(root, dry_run=False):
    source, hypotheses = load_sources(root)
    original = copy.deepcopy(source)
    old_hyp = copy.deepcopy(hypotheses)
    units = {u['unit_id']: u for u in source['units']}
    inputs = sorted((root / 'incoming').glob('*.json')) + sorted((root / 'incoming/atr').glob('*.csv'))
    if not inputs:
        return 0
    now = dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    archives = {}

    def existing(uid):
        if uid not in units:
            raise ValueError('Unknown unit: ' + uid)
        return units[uid]

    def text(value):
        if not isinstance(value, str):
            raise ValueError('Transcription must be a string')
        return value

    def supersede(uid):
        for r in hypotheses:
            if r['unit_id'] == uid and r['decision'] not in ('reject', 'superseded'):
                r['decision'] = 'superseded'
        units[uid]['analysis_status'] = 'needs_reextraction'
        units[uid]['validation_status'] = 'pending_expert'

    for path in inputs:
        content = path.read_bytes()
        digest = hashlib.sha256(content).hexdigest()
        archive = f'incoming/processed/{digest}-{path.name}'
        if (root / archive).exists():
            if (root / archive).read_bytes() != content:
                raise ValueError('Processed packet hash mismatch')
            continue
        archives[archive] = content
        if path.suffix == '.csv':
            for row in read_csv(path):
                u = existing(row['unit_id'])
                if row.get('htr_text'):
                    u['htr_text'] = row['htr_text']
                    # Metrics refer to a specific text pair, never retain old scores.
                    u['cer'] = u['wer'] = None
                for metric in ('cer', 'wer'):
                    if row.get(metric):
                        u[metric] = finite_metric(row[metric], metric)
            continue
        pkg = json.loads(content)
        validate_packet_shape(pkg)
        for uid, update in (pkg.get('transcriptions') or {}).items():
            u = existing(uid)
            if isinstance(update, str):
                # Legacy string packets do not promote a regest to ground truth.
                field = 'regest_note' if u['transcription_status'] == 'regest' else 'text_diplomatic'
                value = update
            else:
                if set(update) - {'text', 'transcription_status'}:
                    raise ValueError('Unknown transcription update fields')
                status = update.get('transcription_status', u['transcription_status'])
                if status not in TSTATUS:
                    raise ValueError('Invalid transcription_status')
                if status != u['transcription_status']:
                    supersede(uid)
                    u['cer'] = u['wer'] = None
                u['transcription_status'] = status
                field = 'regest_note' if status == 'regest' else 'text_diplomatic'
                value = text(update['text'])
            if value != (u.get(field) or ''):
                supersede(uid)
                u[field] = value
                u['cer'] = u['wer'] = None
                # Summaries remain preserved but are explicitly flagged stale.
                u['regest_source'] = 'proposed'
                u['review_flags'] = list(dict.fromkeys(u.get('review_flags', []) + ['text_changed_review_summaries']))
        for n in pkg.get('new_units') or []:
            allowed = {'unit_id', 'folio_start', 'folio_end', 'date_original', 'date_iso', 'date_precision',
                       'marginal_note_raw', 'transcription_status', 'text', 'signatories_raw'}
            if set(n) - allowed:
                raise ValueError('Unknown new-unit fields')
            uid = n['unit_id']
            if uid in units:
                raise ValueError('Duplicate unit: ' + uid)
            status = n.get('transcription_status', 'manual_partial')
            start, end = n['folio_start'], n.get('folio_end') or n['folio_start']
            sides = folio_sides(start, end)
            u = dict(unit_id=uid, register_id='ASVe_CSM_142', register_number=142,
                     folio_raw=start if start == end else start + '-' + end,
                     folio_start=start, folio_end=end, folio_sides=sides,
                     date_original=n.get('date_original', ''), date_iso=n.get('date_iso', ''),
                     date_precision=n.get('date_precision', ''), more_veneto=False, date_check='',
                     title_short=n.get('marginal_note_raw') or uid, marginal_note_raw=n.get('marginal_note_raw', ''),
                     transcription_status=status, text_diplomatic='' if status == 'regest' else text(n.get('text', '')),
                     regest_note=text(n.get('text', '')) if status == 'regest' else '', htr_text='',
                     htr_coverage='', signatories_raw=n.get('signatories_raw', ''), signatories=[], signatory_count=None,
                     signatories_complete='not_checked', signatory_status='not_checked', relation_type='none',
                     related_unit_id='', editorial_notes=[], field_flags=[], reliability='F',
                     source_reference='ASVe, Cinque Savi alla Mercanzia, Risposte, reg. 142, ' + start + '-' + end,
                     text_source='incoming', validation_status='pending_expert', analysis_status='needs_reextraction')
            source['units'].append(u)
            units[uid] = u
        for candidate in pkg.get('new_hypotheses', []):
            if set(candidate) - set(HYP_COLS):
                raise ValueError('Unknown hypothesis fields')
            row = normalize_hyp([candidate])[0]
            unit = existing(row['unit_id'])
            if any(row.get(k) for k in ('decision', 'new_value', 'reviewer', 'reviewed_at')):
                raise ValueError('New hypotheses must be pending; use validations for review')
            validate_anchor(row, unit)
            # An imported proposal never reopens a rejected or previously reviewed row.
            if not any(hypothesis_key(r) == hypothesis_key(row) and r['decision'] != 'superseded' for r in hypotheses):
                hypotheses.append(row)
        for v in pkg.get('validations') or []:
            existing(v['unit_id'])
            feature = v.get('feature') or v.get('field')
            matches = [r for r in hypotheses if r['decision'] != 'superseded' and r['unit_id'] == v['unit_id'] and r['feature'] == feature and r['value'] == v['value']
                       and (not v.get('rule') or v['rule'] == r['rule'])
                       and (not v.get('evidence') or v['evidence'] == r['evidence'])
                       and all(str(v[k]) == str(r.get(k, '')) for k in ANCHOR_COLUMNS if k in v)]
            if len(matches) != 1:
                raise ValueError('Review must identify exactly one hypothesis (use rule and evidence)')
            if matches[0]['decision'] == 'superseded':
                raise ValueError('Hypothesis refers to superseded text; re-extract before review')
            decision = v['decision']
            if decision not in ('accept', 'reject', 'reformulate'):
                raise ValueError('Invalid review decision')
            reviewer = v.get('reviewer') or pkg.get('reviewer')
            if not isinstance(reviewer, str) or not reviewer.strip():
                raise ValueError('Review requires reviewer')
            matches[0].update(decision=decision, new_value=v.get('new_value', ''), reviewer=reviewer, reviewed_at=now)
    if not archives:
        return 0
    source['meta']['generated'] = now
    source['meta']['version'] = 'working-' + now
    files, _ = derive(root, source, hypotheses)  # all validation before any writes
    if dry_run:
        return len(archives)
    files['data/source/units.json'] = json_bytes(source)
    files['data/source/hypotheses.csv'] = csv_bytes(hypotheses, HYP_COLS)
    revision = hashlib.sha256(json_bytes(original) + csv_bytes(old_hyp, HYP_COLS)).hexdigest()
    files[f'data/source/history/{revision}-units.json'] = json_bytes(original)
    files[f'data/source/history/{revision}-hypotheses.csv'] = csv_bytes(old_hyp, HYP_COLS)
    files.update(archives)
    publish(root, files)
    # Already archived packets are idempotent even if cleanup is interrupted.
    for path in inputs:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if (root / f'incoming/processed/{digest}-{path.name}').exists():
            path.unlink()
    return len(archives)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dry-run', action='store_true', help='Validate complete release without writing or consuming packets')
    args = parser.parse_args()
    try:
        count = ingest(ROOT, dry_run=args.dry_run)
        print(f'OK: {count} packets ' + ('validated; nothing written' if args.dry_run else 'processed'))
    except (ValueError, KeyError, TypeError, OSError) as exc:
        parser.exit(1, str(exc) + '\n')
