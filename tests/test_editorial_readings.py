"""Regression checks for source distinctions established during rereading.

These checks guard documented errors; they are not an accuracy benchmark.
"""
import csv
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class EditorialReadingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = {u['unit_id']: u for u in json.loads((ROOT / 'data/source/units.json').read_text())['units']}
        cls.docs = {d['unit_id']: d for d in json.loads((ROOT / 'data/source/qualified_opinions.json').read_text())['documents']}

    def test_distinct_speech_acts_are_not_collapsed(self):
        favourable = self.docs['R142_0035']['nuclei'][0]
        self.assertEqual(favourable['stance'], 'favourable')
        self.assertIn('concedibile', self.units['R142_0035']['regest_it'])
        self.assertEqual(self.docs['R142_0027']['nuclei'][1]['force'], 'report')
        self.assertIn('selling', self.units['R142_0027']['regest_en'])
        self.assertIn('undertake', self.units['R142_0027']['regest_en'])
        self.assertEqual(self.docs['R142_0021']['nuclei'][0]['force'], 'assessment')

    def test_cumulative_recommendations_are_not_alternatives(self):
        relation = next(r for r in self.docs['R142_0012']['relations']
                        if r['from'] == 'R142_0012-N2' and r['to'] == 'R142_0012-N1')
        self.assertEqual(relation['kind'], 'complements')

    def test_new_nucleus_does_not_renumber_existing_ones(self):
        self.assertEqual([n['id'] for n in self.docs['R142_0003']['nuclei']],
                         ['R142_0003-N' + str(n) for n in range(1, 7)])

    def test_photo_checks_preserve_out_of_sequence_date(self):
        self.assertEqual(self.units['R142_0016']['date_iso'], '1607-07-19')
        self.assertEqual(self.units['R142_0016']['date_check'], 'out_of_sequence')
        self.assertEqual(self.units['R142_0013']['folio_sides'], ['31r', '31v', '32r'])
        self.assertEqual(self.units['R142_0017']['folio_sides'], ['35r'])
        self.assertEqual(self.units['R142_0020']['folio_sides'], ['39r'])
        order = list(self.units)
        self.assertLess(order.index('R142_0011'), order.index('R142_0012'))
        self.assertLess(order.index('R142_0012'), order.index('R142_0013'))

    def test_reading_uncertainty_and_ellipsis_are_preserved(self):
        self.assertIn('30 Zener 1587', self.units['R142_0020']['text_diplomatic'])
        text = self.units['R142_0021']['text_diplomatic']
        self.assertIn('m[ercan]tia uedute le l[ette]re', text)
        self.assertIn('stante la qual confirmatione, quando che', text)
        self.assertNotIn('ella possa dar al detto eletto', text)
        self.assertTrue(text.endswith('Tutti'))

    def test_legacy_prohibition_and_changed_reading_are_not_current_hypotheses(self):
        with (ROOT / 'data/source/hypotheses.csv').open() as f:
            rows = list(csv.DictReader(f))
        mistaken = [r for r in rows if r['unit_id'] == 'R142_0013'
                    and r['feature'] == 'decision_orientation' and r['value'] == 'prohibit']
        self.assertTrue(mistaken)
        self.assertTrue(all(r['decision'] == 'superseded' for r in mistaken))
        self.assertFalse([r for r in rows if r['unit_id'] == 'R142_0021'
                          and r['decision'] not in ('superseded', 'reject')])

    def test_overlapping_penalty_threshold_is_not_made_exclusive(self):
        high = self.docs['R142_0019']['nuclei'][13]
        evidence = json.dumps(high, ensure_ascii=False)
        self.assertIn('da trecento', evidence.lower())
        self.assertIn('fino alla summa', evidence)
        self.assertIn('dalla p.a summa', evidence)


if __name__ == '__main__':
    unittest.main()
