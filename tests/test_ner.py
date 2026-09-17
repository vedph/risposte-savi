"""Focused regression examples, not an independently annotated corpus benchmark."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from ner import EntityRecognizer, extract_corpus
from entity_context import build_contexts, document_digest
from text_matching import matching_text, source_digest
from review_packets import validate_anchor, validate_packet_shape, hypothesis_key


class NerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ner = EntityRecognizer()

    def test_word_boundaries_prevent_false_places(self):
        rows = self.ner.extract('romana segnale approdino fiorentini')
        self.assertFalse([r for r in rows if r['label'] == 'LOC'])
        self.assertEqual([r['value'] for r in self.ner.extract('Roma Segna Rodi')], ['Roma', 'Segna', 'Rodi'])

    def test_contextual_person_and_origin_are_separate(self):
        rows = self.ner.extract('Supplica di Antonio Gallo da Bergamo')
        self.assertEqual([(r['label'], r['surface']) for r in rows], [('PER', 'Antonio Gallo'), ('LOC', 'Bergamo')])

    def test_titles_do_not_join_signatories(self):
        text = 'D[ome]nego Lion D. Toma Moc[enig]o'
        rows = self.ner.extract(text, 'signatories_raw')
        self.assertEqual([r['surface'] for r in rows], ['D[ome]nego Lion', 'Toma Moc[enig]o'])
        self.assertEqual([r['surface'] for r in self.ner.extract('Roco Zignoni Gov.')], ['Roco Zignoni'])

    def test_inword_expansion_and_apostrophe_preserve_written_form(self):
        text = "Supplica di Ott[avi]o dall'oglio."
        row = self.ner.extract(text)[0]
        self.assertEqual(row['surface'], "Ott[avi]o dall'oglio")
        self.assertEqual(text[row['span_start']:row['span_end']], row['surface'])

    def test_normalization_maps_unicode_and_whitespace_back_to_source(self):
        text = '🙂 ﬁ  Corfu\u0300\n  VENEZIA'
        rows = self.ner.extract(text)
        self.assertEqual([r['surface'] for r in rows], ['Corfu\u0300', 'VENEZIA'])
        for row in rows:
            self.assertEqual(text[row['span_start']:row['span_end']], row['surface'])
            self.assertEqual(text[row['context_start']:row['context_end']], row['evidence'])
            self.assertEqual(row['source_sha256'], source_digest(text))
        view = matching_text('ﬁ\n  Roma')
        a = view.text.index('roma')
        self.assertEqual(view.original[slice(*view.span(a, a + 4))], 'Roma')

    def test_folded_aliases_match_historical_uv(self):
        self.assertEqual([r['value'] for r in self.ner.extract('Vinegia')], ['Venezia'])

    def test_regions_do_not_receive_city_coordinates(self):
        row = self.ner.extract('Soria')[0]
        self.assertNotEqual(row['value'], 'Aleppo')
        self.assertNotIn('lat', row)

    def test_seragosa_variants_do_not_imply_spanish_city(self):
        text = 'Consule in Saragoza; consule in Seragosa. Saragozza.'
        rows = [r for r in self.ner.extract(text) if r['label'] == 'LOC']
        self.assertEqual([r['surface'] for r in rows], ['Saragoza', 'Seragosa', 'Saragozza'])
        self.assertEqual([r['value'] for r in rows], ['Seragosa', 'Seragosa', 'Saragozza'])
        for row in rows[:2]:
            self.assertEqual(row['normalization_status'], 'unresolved')
            self.assertEqual(text[row['span_start']:row['span_end']], row['surface'])
            self.assertEqual(row['source_sha256'], source_digest(text))
            self.assertFalse({'lat', 'lon', 'coordinates', 'tgn', 'exact_match'} & row.keys())

    def test_siracusa_proposal_is_bound_to_r16_reading_and_both_source_fields(self):
        units = json.loads((ROOT / 'data/source/units.json').read_text())['units']
        unit = next(u for u in units if u['unit_id'] == 'R142_0025')
        other = dict(unit, unit_id='R142_9999')
        report = extract_corpus([unit, other], self.ner)
        research_path = ROOT / 'data/ner/reconciliations.json'
        research = json.loads(research_path.read_text())
        self.assertEqual(research['source_documents']['R142_0025'], document_digest(unit))
        # Give the control document a current digest, so absence of a match
        # tests the explicit document scope rather than a missing hash.
        research['source_documents']['R142_9999'] = document_digest(other)
        with tempfile.TemporaryDirectory() as tmp:
            scoped_path = Path(tmp) / 'research.json'
            scoped_path.write_text(json.dumps(research))
            contexts = build_contexts([unit, other], report['candidates'], scoped_path)
        dossiers = {d['candidate_id']: d for d in contexts['dossiers']}
        places = [c for c in report['candidates'] if c['unit_id'] == 'R142_0025'
                  and c['value'] == 'Seragosa']
        self.assertEqual({(c['source_field'], c['surface']) for c in places}, {
            ('text_diplomatic', 'Seragosa'), ('marginal_note_raw', 'Saragoza')})
        for candidate in places:
            field = unit[candidate['source_field']]
            self.assertEqual(field[candidate['span_start']:candidate['span_end']], candidate['surface'])
            proposal, = dossiers[candidate['candidate_id']]['reconciliations']
            self.assertEqual(proposal['scope_unit_ids'], ['R142_0025'])
            self.assertEqual(proposal['status'], 'proposed')
            self.assertIn('Siracusa', proposal['identity'])
            self.assertEqual(len(proposal['sources']), 2)
            self.assertFalse({'lat', 'lon', 'coordinates', 'tgn', 'exact_match'} & proposal.keys())
        for candidate in report['candidates']:
            if candidate['unit_id'] == 'R142_9999' or candidate['label'] == 'PER':
                self.assertEqual(dossiers[candidate['candidate_id']]['reconciliations'], [])
        people = [c for c in report['candidates'] if c['unit_id'] == 'R142_0025'
                  and c['label'] == 'PER' and c['surface'].startswith('Valerio')]
        self.assertEqual([p['surface'] for p in people], ['Valerio Bellhomo', 'Valerio Mora'])
        self.assertEqual(len({p['candidate_id'] for p in people}), 2)
        changed = dict(unit, date_iso='1608-01-29')
        stale = build_contexts([changed], extract_corpus([changed], self.ner)['candidates'], research_path)
        self.assertTrue(all(not d['reconciliations'] for d in stale['dossiers']))

    def test_domain_cues_do_not_match_inside_unrelated_words(self):
        import extraction
        self.assertIsNone(extraction.extract('loro parte')['policy_domain_hyp'])
        self.assertEqual(extraction.extract('oro')['policy_domain_hyp']['value'], 'currency_monetary')
        self.assertEqual(extraction.extract('moneta')['policy_domain_hyp']['score'], 1)

    def test_repeated_mentions_have_distinct_stable_ids(self):
        units = [dict(unit_id='R142_9999', transcription_status='manual_full', text_diplomatic='Roma e Roma')]
        a = extract_corpus(units, self.ner)
        self.assertEqual(a, extract_corpus(units, self.ner))
        self.assertEqual(len({c['candidate_id'] for c in a['candidates']}), 2)
        units[0]['text_diplomatic'] += '.'
        b = extract_corpus(units, self.ner)
        self.assertFalse({c['candidate_id'] for c in a['candidates']} & {c['candidate_id'] for c in b['candidates']})

    def test_regests_and_htr_are_not_diplomatic_evidence(self):
        units = [dict(unit_id='R142_9999', transcription_status='regest', regest_note='Roma', htr_text='Bergamo', marginal_note_raw='Spalato')]
        before = copy.deepcopy(units)
        self.assertEqual([c['source_field'] for c in extract_corpus(units, self.ner)['candidates']], ['marginal_note_raw'])
        self.assertEqual([c['source_field'] for c in extract_corpus(units, self.ner, True)['candidates']], ['marginal_note_raw', 'regest_note'])
        self.assertEqual(units, before)

    def test_ambiguous_aliases_remain_alternatives(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'authorities.json'
            path.write_text(json.dumps(dict(version=1, entries=[
                dict(label='LOC', name='Ragusa di Dalmazia', aliases=['Ragusa']),
                dict(label='LOC', name='Ragusa in Sicilia', aliases=['Ragusa'])])))
            rows = EntityRecognizer(path).extract('Ragusa')
        self.assertEqual(len(rows), 2)
        self.assertTrue(all(r['ambiguous'] for r in rows))

    def test_external_identity_is_scoped_and_chronology_is_contextual(self):
        units = [dict(unit_id=uid, text_diplomatic=text, date_iso='1607-06-20', transcription_status='manual_full')
                 for uid, text in [('R142_0007', 'dal q. Daniel Rodriga'), ('R142_9999', 'dal q. Daniel Rodriga')]]
        report = extract_corpus(units, self.ner)
        research = json.loads((ROOT / 'data/ner/reconciliations.json').read_text())
        research['source_documents'] = {u['unit_id']: document_digest(u) for u in units}
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'research.json'
            path.write_text(json.dumps(research))
            contexts = build_contexts(units, report['candidates'], path)
            units[0]['date_iso'] = '1610-06-20'
            stale = build_contexts(units, report['candidates'], path)
            self.assertEqual(stale['dossiers'][0]['reconciliations'], [])
        a, b = contexts['dossiers']
        self.assertEqual(a['reconciliations'][0]['chronology'], 'posthumous_reference_supported')
        self.assertEqual(a['status'], 'proposed')
        self.assertEqual(b['reconciliations'], [])
        self.assertEqual(b['status'], 'not_reconciled')

    def test_signatory_research_is_scoped_to_the_document_set(self):
        units = [dict(unit_id=uid, signatories_raw='Francesco Erizzo', date_iso='1608-09-13', transcription_status='manual_full')
                 for uid in ['R142_0039', 'R142_9999']]
        report = extract_corpus(units, self.ner)
        research = json.loads((ROOT / 'data/ner/reconciliations.json').read_text())
        research['source_documents'] = {u['unit_id']: document_digest(u) for u in units}
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'research.json'; path.write_text(json.dumps(research))
            contexts = build_contexts(units, report['candidates'], path)
        matches = contexts['dossiers'][0]['reconciliations']
        self.assertEqual(matches[0]['identity'], 'Francesco Erizzo (1566–1646)')
        self.assertEqual(contexts['dossiers'][1]['reconciliations'], [])

    def test_anchors_reject_stale_partial_or_inexact_evidence(self):
        unit = dict(text_diplomatic='Roma')
        row = self.ner.extract('Roma')[0]
        validate_anchor(row, unit)
        for changes in [dict(span_start=1), dict(source_sha256='stale'), dict(evidence='inferred'), dict(span_start=0.0)]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                validate_anchor(dict(row, **changes), unit)
        with self.assertRaises(ValueError):
            validate_anchor(dict(source_field='text_diplomatic'), unit)

    def test_packet_schema_rejects_invalid_types(self):
        validate_packet_shape(dict(version=1, new_hypotheses=[]))
        for packet in [[], dict(version=True), dict(version=2), dict(new_hypotheses=[1]), dict(transcriptions=[]), dict(reviewer=1)]:
            with self.subTest(packet=packet), self.assertRaises(ValueError):
                validate_packet_shape(packet)

    def test_keys_distinguish_composites_and_occurrences(self):
        self.assertNotEqual(hypothesis_key(dict(value='a|b', rule='c')), hypothesis_key(dict(value='a', rule='b|c')))
        self.assertNotEqual(hypothesis_key(dict(span_start=0)), hypothesis_key(dict(span_start=10)))


if __name__ == '__main__':
    unittest.main()
