"""Source integrity and loss-aware projections across the available corpus."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from qualified_opinions import build, validate, simple_projection
from text_matching import source_digest
from reasoning import extract, extract_corpus


class QualifiedOpinionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.path = ROOT / 'data/source/qualified_opinions.json'
        cls.model = json.loads(cls.path.read_text())
        cls.units = json.loads((ROOT / 'data/source/units.json').read_text())['units']

    def test_reproducible_source_anchors_without_altering_readings(self):
        units = copy.deepcopy(self.units)
        output = build(units, self.path)
        self.assertEqual(output, build(units, self.path))
        self.assertEqual(units, self.units)
        self.assertEqual(output['summary'], dict(documents=64, nuclei=238, transcription_documents=56, regest_documents=8, current_documents=64, stale_documents=0))
        by_id = {u['unit_id']: u for u in units}
        self.assertEqual(set(by_id), {d['unit_id'] for d in output['documents']})
        def anchors(value, uid):
            if isinstance(value, dict):
                if 'quote' in value:
                    text = by_id[uid][value['source_field']]
                    self.assertEqual(text[value['span_start']:value['span_end']], value['quote'])
                    self.assertEqual(source_digest(text), value['source_sha256'])
                for item in value.values(): anchors(item, uid)
            elif isinstance(value, list):
                for item in value: anchors(item, uid)
        for doc in output['documents']:
            anchors(doc, doc['unit_id'])
            self.assertEqual(doc['outcome_status'], 'not_established')

    def test_simple_view_keeps_negation_and_does_not_infer_converse(self):
        doc = next(d for d in self.model['documents'] if d['unit_id'] == 'R142_0020')
        simple = simple_projection(doc)
        self.assertEqual(simple['composition'], 'articulated')
        condition = simple['nuclei'][1]
        self.assertTrue(condition['conditional'])
        self.assertIn('SE NON (', condition['summary'])
        self.assertIn('resta sospesa', condition['summary'])
        self.assertEqual(condition['force'], 'assessment')
        self.assertEqual(simple['relations'][0]['kind'], 'qualifies')
        self.assertIn('cinque lire', simple['nuclei'][0]['summary'])

    def test_alternatives_and_predictions_survive_simplification(self):
        doc = next(d for d in self.model['documents'] if d['unit_id'] == 'R142_0011')
        simple = simple_projection(doc)
        self.assertIn(' E ', simple['nuclei'][1]['summary'])
        self.assertIn(' O ', simple['nuclei'][2]['summary'])
        self.assertEqual(simple['nuclei'][2]['force'], 'prediction')
        self.assertIn('prevede', simple['nuclei'][2]['summary'])
        self.assertEqual(simple['nuclei'][3]['force'], 'preference')
        self.assertEqual(len(simple['relations']), 2)

    def test_optional_qualifiers_and_preserved_exceptions(self):
        doc = copy.deepcopy(self.model['documents'][0])
        doc['nuclei'][0]['qualifications'] = {}
        validate(dict(self.model, documents=[doc]))
        doc['nuclei'][0]['qualifications']['exceptions'] = [dict(kind='test', text='Eccezione di prova', evidence=doc['nuclei'][0]['evidence'])]
        self.assertIn('Eccezione di prova', simple_projection(doc)['nuclei'][0]['summary'])

    def test_changed_reading_or_metadata_quarantines_old_interpretation(self):
        for field in ('text_diplomatic', 'date_iso', 'folio_raw', 'transcription_status'):
            units = copy.deepcopy(self.units)
            unit = next(u for u in units if u['unit_id'] == 'R142_0020')
            unit[field] = str(unit.get(field, '')) + ' changed'
            output = build(units, self.path)
            stale = next(d for d in output['documents'] if d['unit_id'] == unit['unit_id'])
            self.assertEqual(stale['source_status'], 'stale', field)
            self.assertIsNone(stale['simple'])
            self.assertEqual(len(stale['nuclei']), 2)
            self.assertEqual(output['summary']['current_documents'], 63)

    def test_invalid_relations_and_boolean_shapes_fail(self):
        model = copy.deepcopy(self.model)
        next(d for d in model['documents'] if d['unit_id'] == 'R142_0012')['relations'][0]['to'] = 'R142_0020-N1'
        with self.assertRaisesRegex(ValueError, 'relation'): validate(model)
        model = copy.deepcopy(self.model)
        condition = next(d for d in model['documents'] if d['unit_id'] == 'R142_0020')['nuclei'][1]['qualifications']['condition']
        condition['expression'] = dict(op='all_of', operands=[])
        with self.assertRaisesRegex(ValueError, 'two operands'): validate(model)
        condition['expression'] = dict(op='if_and_only_if', text='invented')
        with self.assertRaisesRegex(ValueError, 'operator'): validate(model)

    def test_misattributed_quote_is_rejected(self):
        model = copy.deepcopy(self.model)
        model['documents'][0]['nuclei'][0]['evidence'] = ['A passage absent from this transcription']
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'model.json'
            path.write_text(json.dumps(model))
            with self.assertRaisesRegex(ValueError, 'absent or ambiguous'): build(self.units, path)

    def test_regests_preserve_editorial_source_and_do_not_invent_recommendations(self):
        output = build(self.units, self.path)
        for doc in output['documents']:
            if doc['source_field'] != 'regest_note': continue
            self.assertEqual(doc['transcription_status'], 'regest')
            self.assertIn('regesto', doc['coverage_note'])
            for nucleus in doc['nuclei']:
                self.assertIn(nucleus['force'], {'request', 'topic', 'report', 'assessment'})
                self.assertTrue(all(q['source_field'] == 'regest_note' for q in nucleus['evidence']))

    def test_annex_and_reported_voices_survive_all_projections(self):
        output = build(self.units, self.path)
        doc = next(d for d in output['documents'] if d['unit_id'] == 'R142_0035')
        for nucleus in doc['nuclei'][3:]:
            self.assertEqual(nucleus['voice']['kind'], 'individual')
            self.assertEqual(nucleus['evidence'][0]['source_field'], 'text_annex')
            simple = next(n for n in doc['simple']['nuclei'] if n['id'] == nucleus['id'])
            self.assertIn('Marco da Riva', simple['voice'])
        doc = next(d for d in output['documents'] if d['unit_id'] == 'R142_0014')
        self.assertNotEqual(doc['simple']['nuclei'][0]['voice'], doc['simple']['nuclei'][1]['voice'])
        units = copy.deepcopy(self.units)
        next(u for u in units if u['unit_id'] == 'R142_0035')['text_annex'] += ' changed'
        doc = next(d for d in build(units, self.path)['documents'] if d['unit_id'] == 'R142_0035')
        self.assertEqual(doc['source_status'], 'stale')
        self.assertIsNone(doc['simple'])

    def test_annex_requires_its_hash_and_distinct_voice(self):
        for field in ('annex_sha256', 'voice'):
            model = copy.deepcopy(self.model)
            doc = next(d for d in model['documents'] if d['unit_id'] == 'R142_0035')
            del (doc if field == 'annex_sha256' else doc['nuclei'][3])[field]
            with self.assertRaisesRegex(ValueError, 'Annex nucleus'): validate(model)


class DiscourseCueTests(unittest.TestCase):
    def test_unicode_anchors_and_uncertain_years(self):
        text = '🖋 Riuerentemente dicemo: se prima non paga; con parte del Senato del 1587 (1567?) si dispone.'
        rows = extract(text)
        self.assertEqual({r['kind'] for r in rows}, {'opinion', 'condition', 'precedent'})
        for r in rows:
            self.assertEqual(text[r['span_start']:r['span_end']], r['surface'])
            self.assertEqual(text[r['context_start']:r['context_end']], r['evidence'])
        cited = next(r for r in rows if r['kind'] == 'precedent')['cited_years']
        self.assertEqual([y['value'] for y in cited], ['1587', '1567'])

    def test_regests_and_htr_excluded_without_inferring_absence(self):
        units = [dict(unit_id='A', transcription_status='regest', text_diplomatic='dicemo'),
                 dict(unit_id='B', transcription_status='htr_raw', text_diplomatic='dicemo'),
                 dict(unit_id='C', transcription_status='manual_full', text_diplomatic='Testo senza formule.')]
        report = extract_corpus(units)
        self.assertEqual(report['summary']['processed_units'], 1)
        self.assertEqual(report['summary']['candidates'], 0)
        self.assertEqual(report['coverage'][2]['status'], 'processed')


if __name__ == '__main__':
    unittest.main()
