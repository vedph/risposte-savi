"""Transparent TF-IDF/cosine exploration of the transcribed corpus only."""
from collections import Counter
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
from text_matching import matching_text, source_digest

VERSION = 'tfidf-cosine-1'
STOPWORDS = 'che con per della delle dello degli del dei alla alle allo alli nell nella nelle sono come non vna vno noi voi et in il la le lo gli di da a e o se si ma al vn nel fv'.split()
CONFIG = dict(min_word_length=3, stopwords=STOPWORDS, tf='1 + log(count)',
              idf='log((1 + documents) / (1 + document_frequency)) + 1', norm='L2',
              input='manual diplomatic transcriptions; no regests, metadata or HTR',
              matching='Unicode NFKD, case, accents, u/v, i/j, in-word expansions')


def compare(units):
    docs = [u for u in units if u.get('transcription_status') in {'manual', 'manual_full', 'manual_partial', 'reviewed'}
            and (u.get('text_diplomatic') or '').strip()]
    counts = [Counter(t for t in re.findall(r'\b[^\W\d_]{3,}\b', matching_text(u['text_diplomatic'], expansions=True).text)
                      if t not in STOPWORDS) for u in docs]
    df = Counter(t for c in counts for t in c)
    vectors = []
    for c in counts:
        v = {t: (1 + math.log(n)) * (math.log((1 + len(docs)) / (1 + df[t])) + 1) for t, n in c.items()}
        norm = math.sqrt(sum(x*x for x in v.values()))
        vectors.append({t:x/norm for t, x in v.items()} if norm else {})
    pairs = []
    for i, a in enumerate(vectors):
        for j in range(i + 1, len(vectors)):
            b = vectors[j]
            contributions = sorted(((t, x*b[t]) for t, x in a.items() if t in b), key=lambda v:(-v[1], v[0]))
            pairs.append(dict(left=docs[i]['unit_id'], right=docs[j]['unit_id'],
                              cosine=round(sum(x for t,x in contributions), 6),
                              leading_shared_terms=[dict(term=t, contribution=round(x,6)) for t,x in contributions[:10]]))
    return dict(extractor=VERSION, config=CONFIG,
                config_sha256=hashlib.sha256(json.dumps(CONFIG, sort_keys=True).encode()).hexdigest(),
                note='Lexical similarity is not a dossier link, common authorship or agreement of opinions. Results include formulaic language and partial transcriptions.',
                sources=[dict(unit_id=u['unit_id'], source_sha256=source_digest(u['text_diplomatic'])) for u in docs],
                pairs=sorted(pairs, key=lambda p:(-p['cosine'], p['left'], p['right'])))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    result = compare(json.loads((root / 'data/source/units.json').read_text())['units'])
    body = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
    if args.output:
        args.output.write_text(body)
    else:
        print(body, end='')
