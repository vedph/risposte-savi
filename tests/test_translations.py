"""Translation completeness and reproducible offline assets."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from build_translations import render

class TranslationTests(unittest.TestCase):
    def test_current_model_is_covered_and_assets_are_reproducible(self):
        files=render()
        self.assertEqual(files,render())
        self.assertIn('docs/assets/english.js',files)
        for name,body in files.items():
            self.assertEqual((ROOT/name).read_bytes(),body,name)

    def test_changed_interpretation_requires_an_explicit_translation(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'data/i18n').mkdir(parents=True)
            (root/'data/i18n/en.json').write_text(json.dumps({'Titolo':'Title'}))
            with self.assertRaisesRegex(ValueError,'Missing English interpretation'):
                render(root,[{'title':'Nuovo titolo'}])
            result=render(root,[{'title':'Titolo','evidence':[{'quote':'Citazione non tradotta'}]}])
            self.assertIn('docs/assets/english.js',result)
            self.assertEqual(result['data/i18n/en.json'],result['docs/data/i18n/en.json'])
