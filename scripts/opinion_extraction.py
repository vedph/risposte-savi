"""Reproducible linguistic baseline for enunciations and explicit conditions.

This module consumes transcriptions only, never the authored qualified model.
It produces candidates with exact evidence, not paraphrases or historical facts.
Unresolved scope and speaker identity are explicit abstentions.
"""
from collections import Counter
import hashlib
import json
import re

from text_matching import matching_text, source_digest

VERSION = 'opinion-frames-1'
# Patterns are written in the same u/v-folded alphabet as matching_text.
# Earlier/longer matches take precedence: "non son di opinione" must not
# become the positive "son di opinione" by dropping its negation.
SPECS = [
    ('withheld_judgement', r'\bnon (?:sappiamo|sapendo|possiamo(?:,? ne anco)? con fondamento)\b'),
    ('opinion', r'\b(?:non )?(?:son|sono|siamo) di (?:opinione|parere)\b'),
    ('opinion', r'\b(?:l\W+opinione? mia|il parer nostro|parer nostro)\b'),
    ('prediction', r'\b(?:mi rendo sicvro|si spera|speriamo)\b'),
    ('preference', r'\b(?:a me piv piacerebbe|piv tosto|pivttosto|preferiamo)\b'),
    ('opinion', r'\b(?:non )?(?:givdico|givdichiamo|givdicamo|dicemo|diciamo|le dico|stimiamo|stimamo|stimeremo|stimaremo|riferimo|raccordiamo|proponemo|lavdiamo)\b'),
    ('request', r'\b(?:ricerc(?:ano|ando|avano)|dimand(?:ano|ando|avano)|domand(?:ano|ando)|richied(?:ono|endo)|svpplic(?:ano|ando))\b'),
]
CONDITION = r'\b(?:pvrche|pvr che|a conditione che|con conditione che|a condizione che|a patto che|sempre che|qvando paresse|se)\b'
CONFIG = dict(specs=SPECS, condition=CONDITION, max_condition_chars=700,
              delimiters='strong punctuation and blank lines; explicit comma before enunciation',
              boolean_policy='no Boolean tree inferred from conjunctions',
              attribution_policy='local grammatical person only; identity unresolved')
RULES_SHA256 = hashlib.sha256(json.dumps(CONFIG, sort_keys=True).encode()).hexdigest()
ELIGIBLE = {'manual', 'manual_full', 'manual_partial', 'reviewed'}


def extract(text, uid='', source_field='text_diplomatic', date=''):
    # Imported here so reasoning can add this independent baseline to its output.
    from reasoning import _boundaries
    view = matching_text(text, expansions=True)
    digest = source_digest(text)
    bounds = sorted(set(_boundaries(text) + [m.end() for m in re.finditer(r'\n\s*\n', text)]))

    def anchor(start, end):
        return dict(source_field=source_field, source_sha256=digest,
                    span_start=start, span_end=end, quote=text[start:end])

    def identity(kind, start, end):
        parts = [uid, source_field, digest, VERSION, RULES_SHA256, kind, start, end]
        return hashlib.sha256(json.dumps(parts).encode()).hexdigest()

    def interval(start, end):
        return max(b for b in bounds if b <= start), min(b for b in bounds if b >= end)

    matches = []
    for priority, (kind, pattern) in enumerate(SPECS):
        for match in re.finditer(pattern, view.text):
            start, end = view.span(*match.span())
            matches.append((start, end, priority, kind, match[0]))
    selected = []
    for m in sorted(matches, key=lambda v: (v[0], v[2], -v[1])):
        if not any(m[0] < n[1] and n[0] < m[1] for n in selected):
            selected.append(m)
    frames = []
    for index, (start, end, priority, kind, folded) in enumerate(selected):
        left, right = interval(start, end)
        stop = min(right, selected[index + 1][0]) if index + 1 < len(selected) else right
        # A cue is not sufficient to distinguish an assessment from advice.
        force = kind if kind != 'opinion' else 'undetermined'
        if re.search(r'\b(?:siamo|[a-z]+iamo|dicemo|riferimo|stimamo|proponemo)\b', folded):
            person = 'first_plural'
        elif re.search(r'\b(?:mi|me|mia|son|sono|givdico|dico)\b', folded):
            person = 'first_singular'
        else:
            person = 'unspecified'
        frames.append(dict(candidate_id=identity('frame', start, end), kind=kind,
                           force=force, stance='undetermined', trigger=anchor(start, end),
                           evidence=anchor(start, stop), context=anchor(left, right),
                           voice=dict(grammatical_person=person, identity=None,
                                      status='unresolved', source_field=source_field),
                           negation='explicit_in_trigger' if folded.startswith('non ') else 'not_assessed',
                           rule='F_' + str(priority + 1), status='proposed',
                           outcome_status='not_established'))
    conditions, relations = [], []
    for match in re.finditer(CONDITION, view.text):
        start, end = view.span(*match.span())
        left, right = interval(start, end)
        after = view.text[match.end():match.end() + 15]
        before = view.text[max(0, match.start() - 30):match.start()]
        # Concessive, comparative, interrogative and reflexive uses of se are
        # not sufficient evidence of a conditional relation.
        if match[0] == 'se' and (re.match(r'\s+(?:ben\b|bene\b|stess)', after)
                                or re.search(r'\b(?:come|sapere|sappiamo|dvbito|chiede)\s*$', before)):
            continue
        row = dict(candidate_id=identity('condition', start, end), trigger=anchor(start, end),
                   evidence=anchor(start, right), status='unresolved_scope', rule='C_explicit',
                   expression=None, scope_note='La formula non determina da sola l’ambito della condizione.')
        nearby = [f for f in frames if left <= f['trigger']['span_start'] < right]
        if match[0] != 'se':
            preceding = [f for f in nearby if f['trigger']['span_end'] <= start]
            following = [f for f in nearby if f['trigger']['span_start'] >= end]
            if len(preceding) == 1 and not following and right - end <= CONFIG['max_condition_chars']:
                target = preceding[0]
                row.update(status='linked_candidate', evidence=anchor(end, right),
                           scope_note='Condizione posposta nello stesso segmento; ambito da confrontare con il testo.')
                relations.append(dict(kind='subject_to', condition=row['candidate_id'],
                                      target=target['candidate_id'], rule='C_postposed', status='proposed'))
        else:
            following = [f for f in nearby if f['trigger']['span_start'] >= end]
            # Require an explicit boundary, not proximity. An embedded preference
            # may stay inside the opaque antecedent, without becoming its result.
            delimited = [f for f in following if re.search(r',\s*(?:allora\s+)?$',
                         text[end:f['trigger']['span_start']], re.I)]
            if len(delimited) == 1:
                target = delimited[0]
                between = text[end:target['trigger']['span_start']]
                delimiter = re.search(r',\s*(?:allora\s+)?$', between, re.I)
                if delimiter and len(between) <= CONFIG['max_condition_chars'] and not re.search(CONDITION, matching_text(between).text):
                    condition_end = end + delimiter.start()
                    if text[end:condition_end].strip():
                        row.update(status='linked_candidate', evidence=anchor(end, condition_end),
                                   embedded_frames=[f['candidate_id'] for f in following
                                                    if f['trigger']['span_start'] < condition_end],
                                   scope_note='Confine esplicito prima dell’enunciato conseguente; implicazione unidirezionale.')
                        relations.append(dict(kind='if_then', condition=row['candidate_id'],
                                              target=target['candidate_id'], rule='C_preposed', status='proposed'))
        conditions.append(row)
    return dict(unit_id=uid, source_field=source_field, source_sha256=digest,
                document_date=date, frames=frames, conditions=conditions, relations=relations)


def extract_corpus(units):
    documents, coverage = [], []
    for unit in units:
        eligible = unit.get('transcription_status') in ELIGIBLE
        fields = [f for f in ('text_diplomatic', 'text_annex') if eligible and (unit.get(f) or '').strip()]
        for field in fields:
            documents.append(extract(unit[field], unit['unit_id'], field, unit.get('date_iso', '')))
        coverage.append(dict(unit_id=unit['unit_id'], processed_fields=fields,
                             status='processed' if fields else 'no_eligible_transcription'))
    frames = [f for d in documents for f in d['frames']]
    conditions = [c for d in documents for c in d['conditions']]
    return dict(schema_version=1, extractor=VERSION, rules_sha256=RULES_SHA256,
                offset_unit='Unicode code points; zero-based, end-exclusive',
                note='Rule-generated enunciation candidates. No authored nuclei are read. No historical identity, stance, Boolean scope or Senate outcome is inferred.',
                summary=dict(source_texts=len(documents), frames=len(frames), conditions=len(conditions),
                             linked_conditions=sum(c['status'] == 'linked_candidate' for c in conditions),
                             by_kind=dict(sorted(Counter(f['kind'] for f in frames).items()))),
                coverage=coverage, documents=documents)
