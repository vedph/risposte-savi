"""Extract source-anchored discourse cues, not established deliberative acts.

The documentary unit remains intact. Requests, advice, conditions and references
are separate proposals; no recommendation is promoted to a Senate decision.
"""
from collections import Counter
import hashlib
import json
import re

try:
    from .text_matching import matching_text, source_digest
except ImportError:
    from text_matching import matching_text, source_digest

VERSION = 'discourse-rules-1'
PATTERNS = {
    'request': r'\b(?:ricerca(?:no|ndo)?|richiede(?:ndo)?|dimanda(?:no|ndo)?|domanda(?:no|ndo)?|ricercando|svpplica(?:no|ndo)?)\b',
    'opinion': r'\b(?:dicemo|diciamo|riferimo|givdichiamo|givdicamo|stimiamo|stimamo|stimeremo|stimaremo|lavdiamo|raccordiamo|proponemo|siamo di parere|parer nostro)\b',
    'condition': r'\b(?:se prima|pvrche|pv[r]? che|a conditione che|con conditione|con condizione|a patto che|quando che|sempre che|salvo che)\b',
    'precedent': r'\b(?:part[ei] (?:del|di|presa in) senato|con parte|parte presa|delibero|deliberato|statvti?|leggi|nel libro|nei libri|ne i libri)\b',
    'reason': r'\b(?:perche|poiche|essendo che|atteso che|considerato che)\b',
    'information_limit': r'\b(?:non sapendo|non sappiamo|non possiamo(?:,? ne anco)? con fondamento|senza (?:alcvna|alc[v]?n[ao]) informatione)\b',
}
RULES = {kind: re.compile(pattern) for kind, pattern in PATTERNS.items()}
RULES_SHA256 = hashlib.sha256(json.dumps(PATTERNS, sort_keys=True).encode()).hexdigest()
TEXT_STATUSES = {'manual', 'manual_full', 'manual_partial', 'reviewed'}


def _boundaries(text):
    """Strong punctuation only; short abbreviations and editorial (?) stay intact."""
    boundaries = [0]
    depth = 0
    for index, char in enumerate(text):
        if char in '[(':
            depth += 1
        elif char in '])':
            depth = max(0, depth - 1)
        if depth:
            continue
        if char in ';!?':
            boundaries.append(index + 1)
        elif char == '.':
            word = re.search(r'([^\W\d_]+)$', text[:index])
            if word and len(word[0]) > 3 and word[0].lower() not in {'sign', 'clar', 'ecc', 'illustr', 'cap', 'merc'}:
                boundaries.append(index + 1)
    return sorted(set(boundaries + [len(text)]))


def extract(text, unit_id='', document_date='', entities=()):
    view = matching_text(text, expansions=True)
    digest, bounds = source_digest(text), _boundaries(text)
    proposals = []
    for kind, pattern in RULES.items():
        for match in pattern.finditer(view.text):
            start, end = view.span(*match.span())
            left = max(b for b in bounds if b <= start)
            right = min(b for b in bounds if b >= end)
            # Keep useful surrounding text without pretending a capped excerpt is an act.
            context_start = max(left, start - 180)
            context_end = min(right, end + 900)
            excerpt = text[context_start:context_end]
            years = [dict(value=m[0], span_start=context_start + m.start(),
                          span_end=context_start + m.end())
                     for m in re.finditer(r'\b(?:1[0-9]{3}|20[0-9]{2})\b', excerpt)]
            identity = [unit_id, digest, VERSION, RULES_SHA256, kind, start, end]
            proposals.append(dict(
                candidate_id=hashlib.sha256(json.dumps(identity).encode()).hexdigest(),
                unit_id=unit_id, kind=kind, source_field='text_diplomatic',
                span_start=start, span_end=end, surface=text[start:end],
                context_start=context_start, context_end=context_end, evidence=excerpt,
                context_truncated=context_start > left or context_end < right,
                source_sha256=digest, rule='D_' + kind, extractor=VERSION,
                status='pending_expert_validation', document_date=document_date,
                cited_years=years,
                entity_mentions=[e['candidate_id'] for e in entities
                                 if e['source_field'] == 'text_diplomatic'
                                 and e['span_start'] >= context_start and e['span_end'] <= context_end],
                outcome_status='not_established',
            ))
    return sorted(proposals, key=lambda p: (p['span_start'], p['span_end'], p['kind']))


def extract_corpus(units, entities=()):
    by_unit = {}
    for entity in entities:
        by_unit.setdefault(entity['unit_id'], []).append(entity)
    candidates, coverage = [], []
    for unit in units:
        text = unit.get('text_diplomatic') or ''
        eligible = unit.get('transcription_status') in TEXT_STATUSES and bool(text.strip())
        rows = extract(text, unit['unit_id'], unit.get('date_iso', ''), by_unit.get(unit['unit_id'], [])) if eligible else []
        candidates.extend(rows)
        coverage.append(dict(unit_id=unit['unit_id'],
                             status='processed' if eligible else 'no_eligible_transcription',
                             candidates=len(rows), source_sha256=source_digest(text)))
    return dict(schema_version=1, extractor=VERSION, rules_sha256=RULES_SHA256,
                offset_unit='Unicode code points; zero-based, end-exclusive',
                note='Discourse cues are proposals, not complete acts. Shared passages do not establish relationships. No cue does not mean no act. Cited years are not document dates.',
                summary=dict(candidates=len(candidates), processed_units=sum(c['status'] == 'processed' for c in coverage),
                             units_with_candidates=len({c['unit_id'] for c in candidates}),
                             by_kind=dict(sorted(Counter(c['kind'] for c in candidates).items()))),
                coverage=coverage, candidates=candidates)
