"""Linguistic failure cases; these are regression tests, not historical labels."""
import copy
import json
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from opinion_extraction import extract, extract_corpus


class OpinionExtractionTests(unittest.TestCase):
    def test_negated_opinion_is_one_frame_and_not_a_positive_verdict(self):
        report = extract('Non son di opinione che si introduchi detta scala.')
        self.assertEqual(len(report['frames']), 1)
        frame = report['frames'][0]
        self.assertEqual(frame['negation'], 'explicit_in_trigger')
        self.assertEqual(frame['stance'], 'undetermined')
        self.assertEqual(frame['force'], 'undetermined')

    def test_conditional_prediction_does_not_become_recommendation(self):
        report = extract('Se si continuerà questo viaggio, mi rendo sicuro che torneranno.')
        self.assertEqual(report['frames'][0]['force'], 'prediction')
        self.assertEqual(report['relations'][0]['kind'], 'if_then')
        self.assertEqual(report['conditions'][0]['evidence']['quote'].strip(), 'si continuerà questo viaggio')
        self.assertEqual(report['frames'][0]['outcome_status'], 'not_established')

    def test_postposed_condition_preserves_polarity_and_abstains_from_boolean_scope(self):
        report = extract('Stimiamo che si conceda, purché non siano forestieri e paghino il datio.')
        self.assertEqual(report['relations'][0]['kind'], 'subject_to')
        self.assertIn('non siano', report['conditions'][0]['evidence']['quote'])
        self.assertIsNone(report['conditions'][0]['expression'])

    def test_concession_comparison_and_indirect_question_do_not_make_edges(self):
        for text in ['Se ben che sia impedita, mi rendo sicuro che torneranno.',
                     'Come se fosse qui, giudico che tornerà.',
                     'Non sappiamo se verrà.', 'Per se stesso giudico il fatto.']:
            with self.subTest(text=text):
                self.assertEqual(extract(text)['conditions'], [])

    def test_embedded_preference_is_not_the_consequent(self):
        report = extract('Se o con la galea o con vassello, che a me più piacerebbe, si continuerà questo viaggio, mi rendo sicuro che torneranno.')
        self.assertEqual(len(report['frames']), 2)
        self.assertEqual(report['relations'][0]['target'], report['frames'][1]['candidate_id'])
        self.assertEqual(report['conditions'][0]['embedded_frames'], [report['frames'][0]['candidate_id']])
        self.assertIsNone(report['conditions'][0]['expression'])
        self.assertTrue(all(f['voice']['identity'] is None for f in report['frames']))

    def test_competing_consequents_cause_abstention(self):
        report = extract('Se vengono, giudico che giovi, stimiamo che si faccia.')
        self.assertEqual(report['relations'], [])

    def test_unicode_anchors_and_stability_including_annex(self):
        text = '🙂 ﬁ\nMi rendo sicu\u0300ro che verrà. Stimiamo che giovi.'
        report = extract(text, 'A', 'text_annex')
        self.assertEqual(report, extract(text, 'A', 'text_annex'))
        for frame in report['frames']:
            for key in ['trigger', 'evidence', 'context']:
                a = frame[key]
                self.assertEqual(text[a['span_start']:a['span_end']], a['quote'])
                self.assertEqual(a['source_field'], 'text_annex')
        other = extract(text + '.', 'A', 'text_annex')
        self.assertNotEqual(report['frames'][0]['candidate_id'], other['frames'][0]['candidate_id'])

    def test_regests_and_htr_are_excluded_and_annex_is_separate(self):
        units = [dict(unit_id='A', transcription_status='manual_partial', text_diplomatic='Stimiamo che giovi.', text_annex='Giudico che giovi.'),
                 dict(unit_id='B', transcription_status='regest', regest_note='Stimiamo che giovi.', htr_text='Giudico che giovi.')]
        before = copy.deepcopy(units)
        result = extract_corpus(units)
        self.assertEqual(units, before)
        self.assertEqual([d['source_field'] for d in result['documents']], ['text_diplomatic', 'text_annex'])
        self.assertEqual(result['coverage'][1]['status'], 'no_eligible_transcription')

    def test_conditions_do_not_cross_sentences_or_paragraphs(self):
        report = extract('Se verranno le merci.\n\nMi rendo sicuro che gioverà.')
        self.assertEqual(report['relations'], [])

    def test_historical_when_condition_survives_uv_normalization(self):
        report = extract('Quando paresse alla Serenità Vostra far inviar detta galea.')
        self.assertEqual(report['conditions'][0]['trigger']['quote'], 'Quando paresse')
        self.assertEqual(report['conditions'][0]['status'], 'unresolved_scope')

    def test_every_corpus_anchor_round_trips_to_its_own_source(self):
        units = json.loads((Path(__file__).resolve().parents[1] / 'data/source/units.json').read_text())['units']
        by_id = {u['unit_id']:u for u in units}
        def visit(value, text):
            if isinstance(value, dict):
                if 'quote' in value:
                    self.assertEqual(text[value['span_start']:value['span_end']], value['quote'])
                for v in value.values(): visit(v,text)
            elif isinstance(value,list):
                for v in value: visit(v,text)
        for doc in extract_corpus(units)['documents']:
            visit(doc, by_id[doc['unit_id']][doc['source_field']])

    def test_similarity_is_symmetric_bounded_and_not_a_relation_classifier(self):
        from similarity import compare
        units = [dict(unit_id='A',transcription_status='manual_full',text_diplomatic='Le mercantie passano per Spalato.'),
                 dict(unit_id='B',transcription_status='manual_full',text_diplomatic='Le mercantie passano per Spalato.'),
                 dict(unit_id='C',transcription_status='regest',regest_note='Le mercantie passano per Spalato.')]
        report = compare(units)
        self.assertEqual(len(report['pairs']),1)
        self.assertEqual(report['pairs'][0]['cosine'],1)
        self.assertNotIn('relation_type',report['pairs'][0])
        self.assertEqual(report,compare(units))


if __name__ == '__main__':
    unittest.main()
