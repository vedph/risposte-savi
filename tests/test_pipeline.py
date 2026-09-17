"""Regression checks for release integrity and editorial transactions."""
import copy
import csv
import io
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import pipeline as p
from ingest_and_rebuild import ingest


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for folder in ('data/source', 'data/vocabularies', 'data/ner', 'data/i18n', 'docs'):
            shutil.copytree(ROOT / folder, self.root / folder)
        shutil.copy(ROOT / 'data/SCHEMA.md', self.root / 'data/SCHEMA.md')
        self.source, self.hyp = p.load_sources(self.root)

    def packet(self, obj):
        (self.root / 'incoming').mkdir(exist_ok=True)
        path = self.root / 'incoming/test.json'
        path.write_text(json.dumps(obj))
        return path

    def rows(self, files, name):
        return list(csv.DictReader(io.StringIO(files[name].decode())))

    def test_build_deterministic_and_documentary_preserved(self):
        files, manifest = p.derive(self.root)
        self.assertEqual(files, p.derive(self.root)[0])
        self.assertEqual(manifest['documentary_units'], 64)
        self.assertIsNone(manifest['covered_folios'])
        self.assertIsNone(manifest['total_folios'])
        self.assertEqual(manifest['reference_coverage']['covered_numbers'], 93)
        self.assertEqual(manifest['gap_rows'], 24)
        for name in ('documentary.csv', 'analytical.csv', 'units.json', 'hypotheses.csv', 'qualified_opinions.json'):
            self.assertEqual(files['data/' + name], files['docs/data/' + name])
        self.assertNotIn('data/hypo.js', files)
        self.assertIn('docs/data/hypo.js', files)
        generated = json.loads(files['docs/data/units.json'])['units']
        for before, after in zip(self.source['units'], generated):
            for key in ('text_diplomatic', 'regest_note', 'folio_raw', 'date_original', 'date_iso', 'signatories_raw', 'htr_text'):
                self.assertEqual(before.get(key), after.get(key), (before['unit_id'], key))
        doc = self.rows(files, 'data/documentary.csv')
        covered = {int(s[:-1]) for u in self.source['units'] for s in u['folio_sides']}
        missing = {n for r in doc if r['unit_id'].startswith('R142_G') for n in range(int(r['folio_start']), int(r['folio_end'])+1)}
        self.assertFalse(covered & missing)
        self.assertEqual(covered | missing, set(range(1,193)))

    def test_unreconciled_foliation_cannot_be_reported_as_archival_coverage(self):
        files, manifest = p.derive(self.root)
        meta = json.loads(files['data/units.json'])['meta']
        self.assertEqual(manifest['schema_version'], 2)
        self.assertEqual(meta['coverage_status'], 'unreconciled_foliation')
        for key in ('coverage_carte', 'coverage_percent', 'coverage_folios', 'total_folios'):
            self.assertIsNone(meta[key], key)
        self.assertEqual(meta['coverage_reported'], '97/192')

        self.assertEqual(meta['reference_coverage']['ratio'], '93/192')
        self.assertEqual(meta['reference_coverage'], manifest['reference_coverage'])
        self.assertNotIn('Minimum reproducible coverage', files['data/PROVENANCE.md'].decode())
        self.assertIn('not archival coverage', files['data/PROVENANCE.md'].decode())
        self.assertIn('legacy_working_references', files['docs/data/gaps.js'].decode())

    def test_archival_review_requires_explicit_scope_and_note(self):
        source = copy.deepcopy(self.source)
        source['meta']['foliation_review']['note'] = ''
        with self.assertRaisesRegex(ValueError, 'Invalid foliation_review'):
            p.derive(self.root, source, self.hyp)

    def test_transcription_quality_report_flags_reviewable_passages(self):
        report = p.audit_transcriptions(self.source['units'])
        self.assertEqual(report['summary']['total_units'], 64)
        self.assertEqual(report['summary']['manual_units'], 56)
        self.assertEqual(report['summary']['regest_units'], 8)
        self.assertIn('R142_0016', {r['unit_id'] for r in report['units'] if 'unbalanced_brackets' in r['flags']})
        high = {r['unit_id'] for r in report['units'] if r['priority'] == 'high'}
        self.assertIn('R142_0005', high)
        self.assertGreater(report['summary']['flagged_units'], 0)
        self.assertEqual(report['summary']['evaluated_units'], 27)

    def test_check_detects_published_drift(self):
        files, _ = p.derive(self.root)
        p.publish(self.root, files)
        p.check(self.root)
        (self.root / 'docs/data/analytical.csv').write_text('broken')
        with self.assertRaisesRegex(ValueError, 'docs/data/analytical.csv'):
            p.check(self.root)

    def test_unknown_vocabulary_duplicate_and_invalid_date_fail(self):
        h = copy.deepcopy(self.hyp)
        h[0]['value'] = 'invented'
        with self.assertRaisesRegex(ValueError, 'outside vocabulary'):
            p.derive(self.root, self.source, h)
        source = copy.deepcopy(self.source)
        source['units'][0]['date_iso'] = '1607-02-30'
        with self.assertRaisesRegex(ValueError, 'invalid date'):
            p.derive(self.root, source, self.hyp)
        with self.assertRaisesRegex(ValueError, 'duplicate hypothesis'):
            p.derive(self.root, self.source, self.hyp + [self.hyp[0]])

    def test_unresolved_relation_requires_explanation(self):
        source = copy.deepcopy(self.source)
        source['units'][0]['relation_type'] = 'dissent_to'
        with self.assertRaisesRegex(ValueError, 'missing relation target'):
            p.derive(self.root, source, self.hyp)

    def test_review_updates_every_projection_and_preserves_source_text(self):
        before = copy.deepcopy(self.source)
        h = next(r for r in self.hyp if r['feature'] == 'decision_orientation')
        self.packet({'reviewer':'Test reviewer', 'validations':[dict(h, decision='reformulate', new_value='deny')]})
        self.assertEqual(ingest(self.root), 1)
        p.check(self.root)
        payload = json.loads((self.root / 'docs/data/units.json').read_text())
        u = next(u for u in payload['units'] if u['unit_id'] == h['unit_id'])
        self.assertEqual(u['hyp']['decision_orientation']['value'], 'deny')
        self.assertEqual(u['hyp']['decision_orientation']['status'], 'validated')
        rows = p.read_csv(self.root / 'docs/data/analytical.csv')
        row = next(r for r in rows if r['unit_id'] == h['unit_id'])
        self.assertEqual(row['decision_orientation'], 'deny')
        self.assertEqual(row['decision_orientation_status'], 'present')
        self.assertEqual(row['decision_orientation_review_status'], 'validated')
        for original, current in zip(before['units'], payload['units']):
            self.assertEqual(original['text_diplomatic'], current['text_diplomatic'])
        self.assertEqual(ingest(self.root), 0)

    def test_reject_removes_from_site_but_preserves_audit(self):
        h = next(r for r in self.hyp if r['feature'] == 'decision_orientation')
        self.packet({'reviewer':'Test reviewer','validations':[dict(h, decision='reject')]})
        ingest(self.root)
        payload = json.loads((self.root / 'docs/data/units.json').read_text())
        u = next(u for u in payload['units'] if u['unit_id'] == h['unit_id'])
        self.assertNotIn('decision_orientation', u['hyp'])
        audit = p.read_csv(self.root / 'docs/data/hypotheses.csv')
        self.assertTrue(any(r['decision'] == 'reject' for r in audit))
        js = (self.root / 'docs/data/hypo.js').read_text()
        slim = json.loads(js.split('window.HYPO=', 1)[1].rstrip(';\n'))
        self.assertFalse(any(r['u'] == h['unit_id'] and r['f'] == h['feature'] for r in slim))

    def test_one_accept_does_not_validate_other_candidates(self):
        h = copy.deepcopy(self.hyp)
        r = next(r for r in h if r['feature'] == 'decision_orientation')
        r.update(decision='accept', reviewer='Test', reviewed_at='2026-09-08')
        second = dict(r, value='deny', decision='', reviewer='', reviewed_at='', evidence='Other evidence')
        files, _ = p.derive(self.root, self.source, h + [second])
        row = next(r2 for r2 in self.rows(files, 'data/analytical.csv') if r2['unit_id'] == r['unit_id'])
        self.assertEqual(row['decision_orientation_review_status'], 'pending_expert_validation')

    def test_new_unit_has_required_rendering_fields_and_exact_sides(self):
        self.packet({'new_units':[{'unit_id':'R142_9999','folio_start':'100v','folio_end':'101r','text':'Test'}]})
        ingest(self.root)
        payload = json.loads((self.root / 'docs/data/units.json').read_text())
        u = next(u for u in payload['units'] if u['unit_id'] == 'R142_9999')
        self.assertEqual(u['folio_sides'], ['100v','101r'])
        for key in ('hyp', 'terms', 'places', 'persons_hyp', 'signatories'):
            self.assertIn(key, u)
        self.assertEqual(u['validation_status'], 'pending_expert')

    def test_place_projection_requires_all_occurrences_to_be_reviewed(self):
        source = {'units': [{'unit_id': 'demo', 'places': []}]}
        hs = p.normalize_hyp([
            dict(unit_id='demo', feature='geography', value='Spalato', evidence='First occurrence', decision='accept'),
            dict(unit_id='demo', feature='geography', value='Spalato', evidence='Second occurrence', decision='')])
        place = p.project_units(source, hs)['units'][0]['places'][0]
        self.assertEqual(place['status'], 'pending_expert_validation')
        self.assertEqual(len(place['evidence']), 2)

    def test_transcription_change_supersedes_hypotheses_and_saves_history(self):
        u = next(u for u in self.source['units'] if u['text_diplomatic'] and u['hyp'])
        previous_snapshots = set((self.root / 'data/source/history').glob('*-units.json'))
        self.packet({'transcriptions':{u['unit_id']:'Changed text'}})
        ingest(self.root)
        current = json.loads((self.root / 'docs/data/units.json').read_text())
        current = next(x for x in current['units'] if x['unit_id']==u['unit_id'])
        self.assertEqual(current['hyp'], {})
        self.assertEqual(current['analysis_status'], 'needs_reextraction')
        self.assertIsNone(current['cer'])
        snapshots = list(set((self.root / 'data/source/history').glob('*-units.json')) - previous_snapshots)
        self.assertEqual(len(snapshots), 1)
        old = next(x for x in json.loads(snapshots[0].read_text())['units'] if x['unit_id']==u['unit_id'])
        self.assertEqual(old['text_diplomatic'], u['text_diplomatic'])

    def test_bad_packet_does_not_mutate_or_consume_anything(self):
        before = (self.root / 'data/source/units.json').read_bytes()
        path = self.packet({'new_units':[{'unit_id':'R142_9999','folio_start':'1r','text':'Test'}],
                            'transcriptions':{'R142_UNKNOWN':'text'}})
        with self.assertRaisesRegex(ValueError, 'Unknown unit'):
            ingest(self.root)
        self.assertEqual((self.root / 'data/source/units.json').read_bytes(), before)
        self.assertTrue(path.exists())
        self.assertFalse((self.root / 'incoming/processed').exists())

    def test_commit_failure_rolls_back_and_keeps_input(self):
        p.publish(self.root, p.derive(self.root)[0])
        before = {str(x.relative_to(self.root)): x.read_bytes() for x in self.root.rglob('*') if x.is_file()}
        packet = self.packet({'new_units':[{'unit_id':'R142_9999','folio_start':'1r','text':'Test'}]})
        real_replace = p.os.replace
        calls = 0
        def fail_once(a, b):
            nonlocal calls
            calls += 1
            if calls == 4:
                raise OSError('simulated disk failure')
            return real_replace(a, b)
        with patch.object(p.os, 'replace', side_effect=fail_once), self.assertRaisesRegex(OSError, 'simulated'):
            ingest(self.root)
        for name, body in before.items():
            self.assertEqual((self.root / name).read_bytes(), body, name)
        self.assertTrue(packet.exists())

    def test_regest_is_not_promoted_by_legacy_packet(self):
        u = next(u for u in self.source['units'] if u['transcription_status'] == 'regest')
        self.packet({'transcriptions':{u['unit_id']:'Updated summary'}})
        ingest(self.root)
        source, _ = p.load_sources(self.root)
        new = next(x for x in source['units'] if x['unit_id'] == u['unit_id'])
        self.assertEqual(new['transcription_status'], 'regest')
        self.assertEqual(new['text_diplomatic'], '')

    def test_folio_ranges_and_legacy_headers(self):
        self.assertEqual(p.folio_sides('3v','4r'), ['3v','4r'])
        self.assertEqual(p.folio_sides('3'), ['3r','3v'])
        with self.assertRaises(ValueError):
            p.folio_sides('4r','3v')
        self.assertEqual(p.normalize_hyp([{'field':'place','rule_id':'G'}])[0]['feature'], 'place')

    def ner_candidate(self):
        c = next(c for c in p.extract_corpus(self.source['units'])['candidates'] if c['label'] == 'PER')
        return {k: c[k] for k in p.HYP_COLS if k in c}

    def test_new_anchored_hypothesis_review_packet_roundtrip(self):
        c = self.ner_candidate()
        before = copy.deepcopy(self.source['units'])
        packet = dict(version=1, reviewer='Regression test', new_hypotheses=[c], validations=[dict(c, decision='accept')])
        self.packet(packet)
        ingest(self.root)
        current, hs = p.load_sources(self.root)
        matches = [h for h in hs if h['candidate_id'] == c['candidate_id']]
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]['decision'], 'accept')
        self.assertEqual(current['units'], before)
        p.check(self.root)
        self.packet(dict(version=1, note='Same proposal, distinct packet', new_hypotheses=[c]))
        ingest(self.root)
        self.assertEqual(len(p.load_sources(self.root)[1]), len(hs))

    def test_dry_run_keeps_source_outputs_and_incoming_packet(self):
        self.packet(dict(version=1, new_hypotheses=[self.ner_candidate()]))
        before = {str(x.relative_to(self.root)): x.read_bytes() for x in self.root.rglob('*') if x.is_file()}
        self.assertEqual(ingest(self.root, dry_run=True), 1)
        after = {str(x.relative_to(self.root)): x.read_bytes() for x in self.root.rglob('*') if x.is_file()}
        self.assertEqual(before, after)

    def test_stale_ner_packet_rejected_atomically(self):
        c = self.ner_candidate()
        u = next(u for u in self.source['units'] if u['unit_id'] == c['unit_id'])
        self.packet(dict(version=1, new_hypotheses=[c], transcriptions={u['unit_id']: u['text_diplomatic'] + ' Changed.'}))
        before = (self.root / 'data/source/units.json').read_bytes()
        with self.assertRaisesRegex(ValueError, 'source changed'):
            ingest(self.root)
        self.assertEqual((self.root / 'data/source/units.json').read_bytes(), before)
        self.assertTrue((self.root / 'incoming/test.json').exists())

    def test_pending_proposals_cannot_smuggle_approval(self):
        self.packet(dict(version=1, new_hypotheses=[dict(self.ner_candidate(), decision='accept')]))
        with self.assertRaisesRegex(ValueError, 'must be pending'):
            ingest(self.root)

    def test_zero_spans_and_metrics_are_preserved_and_nonfinite_rejected(self):
        self.assertEqual(p.normalize_hyp([dict(span_start=0, confidence=0)])[0]['span_start'], '0')
        for bad in [float('nan'), float('inf'), -1, True]:
            source = copy.deepcopy(self.source)
            source['units'][0]['cer'] = bad
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                p.derive(self.root, source, self.hyp)


if __name__ == '__main__':
    unittest.main()
