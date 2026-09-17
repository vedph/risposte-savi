"""Conservative, offline PER/LOC/ORG proposals with exact source provenance.

No model weights, external service, implicit OCR correction or identity linking.
Rules and authorities are compiled once per corpus, not once per record.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

try:
    from .text_matching import matching_text, source_digest
except ImportError:  # Direct script entry points.
    from text_matching import matching_text, source_digest

VERSION = 'rules-ner-1'
AUTHORITY_PATH = Path(__file__).resolve().parents[1] / 'data/ner/authorities.json'
FEATURES = {'PER': 'actors', 'LOC': 'geography', 'ORG': 'institutional_terms'}
SOURCE_FIELDS = ('text_diplomatic', 'marginal_note_raw', 'signatories_raw', 'regest_note')
MANUAL_STATUSES = {'manual', 'manual_full', 'manual_partial', 'reviewed'}
GIVEN_NAMES = '''Antonio Andrea Alberto Ambroso Anzolo Carlo Daniele Domenico Domenego
    Ferdinando Ferigo Federico Francesco Fantin Galvan Giacomo Hieronimo Hippolito Battista Daniel
    Iseppo Iosua Liberale Lorenzo Lucillo Maffio Marco Marin Michiel Nadal Nicolo
    Ottavio Paulo Pietro Piero Prospero Roco Ruzier Toma Valerio Vicenzo Vidal Zuanne'''
STOP_WORDS = '''et e per che nella quale fratelli furono figliuoli figliuolo patron
    mercante mercanti hebreo hebrei bergamasco milanesi veneto governator consule
    signor ser serenita signoria vostra savi savij senato collegio ill ecc
    eccellentissimo eccellentissima illustrissimo clarissimo provedito proveditor
    generale general bergamaschi dall'ecc dell'ecc dall'ill d m p gov'''
TOKEN = re.compile(r"[^\W\d_]+(?:'[^\W\d_]+)?\.?")
CONTEXT = re.compile(r'(?:svpp(?:licatione|licazione|lica|\.ne)\s+(?:di|de|del)\s+'
                     r'(?:(?:m|d)\.\s*|fedel\s+)?|(?:fedel|persona\s+(?:di|de)|'
                     r'nome\s+(?:di|de)|qvondam|q\.)\s+|(?<!\w)d\.\s+)$')


def _fold(text):
    return matching_text(text, expansions=True).text


class EntityRecognizer:
    def __init__(self, authority_path=AUTHORITY_PATH):
        body = Path(authority_path).read_bytes()
        self.authority_sha256 = hashlib.sha256(body).hexdigest()
        config = json.loads(body)
        if config.get('version') != 1 or not isinstance(config.get('entries'), list):
            raise ValueError('Unsupported NER authority schema')
        aliases = {}
        self.place_aliases = set()
        for entry in config['entries']:
            if entry.get('label') not in FEATURES or not entry.get('name') or not entry.get('aliases'):
                raise ValueError('Incomplete NER authority entry')
            for alias in entry['aliases']:
                folded = _fold(alias)
                if not folded.strip():
                    raise ValueError('Empty NER alias')
                alternatives = aliases.setdefault(folded, [])
                if not any(x['label'] == entry['label'] and x['name'] == entry['name'] for x in alternatives):
                    alternatives.append(entry)
                if entry['label'] == 'LOC':
                    self.place_aliases.add(folded)
        # Longest phrase first; lexical boundaries prevent Roma in "romana".
        self.aliases = aliases
        self.matcher = re.compile(r'(?<!\w)(?:' + '|'.join(
            re.escape(a) for a in sorted(aliases, key=lambda a: (-len(a), a))) + r')(?!\w)')
        self.given_names = {_fold(n) for n in GIVEN_NAMES.split()}
        self.stop_words = {_fold(n) for n in STOP_WORDS.split()} | self.place_aliases

    def extract(self, text, source_field='text_diplomatic'):
        view = matching_text(text, expansions=True)
        digest = source_digest(text)
        entities = []

        def entity(a, b, label, value, rule, **extra):
            start, end = view.span(a, b)
            surface = text[start:end]
            context_start, context_end = max(0, start - 50), min(len(text), end + 50)
            return dict(label=label, value=value, surface=surface, rule=rule,
                        source_field=source_field, span_start=start, span_end=end,
                        source_sha256=digest, evidence=text[context_start:context_end],
                        context_start=context_start, context_end=context_end,
                        status='pending_expert_validation', confidence='low', **extra)

        for match in self.matcher.finditer(view.text):
            choices = self.aliases[match.group()]
            for entry in choices:
                entities.append(entity(match.start(), match.end(), entry['label'], entry['name'],
                                       'NER_authority', normalization_status=entry.get('normalization_status', 'proposed'),
                                       ambiguous=len(choices) > 1))

        tokens = list(TOKEN.finditer(view.text))
        occupied = [(e['span_start'], e['span_end']) for e in entities]
        for i, token in enumerate(tokens):
            first = token.group().rstrip('.')
            prefix = view.text[max(0, token.start() - 90):token.start()]
            contextual = bool(CONTEXT.search(prefix))
            initial = len(first) == 1 and token.group().endswith('.')
            start, _ = view.span(token.start(), token.end())
            if any(a <= start < b for a, b in occupied):
                continue
            if first in self.stop_words or not (first in self.given_names or initial or contextual):
                continue
            if initial and first not in {'z', 'g', 'f'}:
                continue
            if first not in self.given_names and not initial and not text[start].isupper():
                continue
            end = token.end()
            parts = 1
            j = i + 1
            while j < min(len(tokens), i + 5):
                next_token = tokens[j]
                gap = view.text[end:next_token.start()]
                if gap != ' ':
                    break
                word = next_token.group().rstrip('.')
                raw_start, _ = view.span(next_token.start(), next_token.end())
                if word in self.stop_words:
                    break
                if word in {'di', 'de', 'da'}:
                    if j + 1 >= len(tokens) or view.text[next_token.end():tokens[j + 1].start()] != ' ':
                        break
                    following = tokens[j + 1]
                    fa, _ = view.span(following.start(), following.end())
                    if following.group().rstrip('.') in self.stop_words or not text[fa].isupper():
                        break
                    end = following.end()
                    parts += 1
                    j += 2
                    continue
                if not (text[raw_start].isupper() or word in self.given_names or word.startswith(("dall'", "dell'", "d'"))):
                    break
                end = next_token.end()
                parts += 1
                j += 1
            if parts < 2:
                continue
            if view.text[end - 1:end] == '.':
                end -= 1  # Sentence punctuation is not part of a contextual name.
            a, b = view.span(token.start(), end)
            if any(a < hi and b > lo for lo, hi in occupied):
                continue
            # Preserve the written name. Only authority rules propose expansions.
            entities.append(entity(token.start(), end, 'PER', text[a:b],
                                   'NER_person_context' if contextual else 'NER_person_name',
                                   normalization_status='unresolved', ambiguous=False))
            occupied.append((a, b))
        return sorted(entities, key=lambda e: (e['span_start'], e['span_end'], e['label'], e['value']))


def extract_corpus(units, recognizer=None, include_regests=False):
    recognizer = recognizer or EntityRecognizer()
    candidates, sources = [], []
    for unit in units:
        fields = ['marginal_note_raw', 'signatories_raw']
        if unit.get('transcription_status') in MANUAL_STATUSES:
            fields.insert(0, 'text_diplomatic')
        if include_regests:
            fields.append('regest_note')
        for field in fields:
            text = unit.get(field) or ''
            if not text:
                continue
            sources.append(dict(unit_id=unit['unit_id'], source_field=field, source_sha256=source_digest(text)))
            for row in recognizer.extract(text, field):
                row.update(unit_id=unit['unit_id'], feature=FEATURES[row['label']], extractor=VERSION,
                           authority_sha256=recognizer.authority_sha256)
                identity = [row[k] for k in ('unit_id', 'source_field', 'source_sha256', 'span_start', 'span_end', 'label', 'value', 'extractor', 'authority_sha256')]
                row['candidate_id'] = hashlib.sha256(json.dumps(identity, ensure_ascii=False).encode('utf-8')).hexdigest()
                candidates.append(row)
    return dict(schema_version=1, extractor=VERSION, authority_sha256=recognizer.authority_sha256,
                offset_unit='Unicode code points; zero-based, end-exclusive',
                include_regests=include_regests, sources=sources,
                summary=dict(candidates=len(candidates), units_with_candidates=len({c['unit_id'] for c in candidates}),
                             by_label=dict(sorted(Counter(c['label'] for c in candidates).items())),
                             by_source_field=dict(sorted(Counter(c['source_field'] for c in candidates).items()))),
                candidates=candidates)
