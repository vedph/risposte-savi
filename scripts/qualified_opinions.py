"""A common opinion core with optional qualifications and linked, repeatable nuclei.

This compiles assistant-authored interpretations, not automatic annotations.
Dropping detail must not erase conditions, exceptions, scope, voice or modality.
"""
import copy
import hashlib
import json
import re

try:
    from .entity_context import document_digest
    from .text_matching import source_digest
except ImportError:
    from entity_context import document_digest
    from text_matching import source_digest

PROFILE = 'risposte-qualified-opinion-1'
STANCES = {'favourable', 'opposed', 'mixed', 'neutral', 'undetermined'}
FORCES = {'recommendation', 'assessment', 'prediction', 'preference', 'withheld_judgement', 'request', 'topic', 'report'}
RELATIONS = {'alternative_to', 'complements', 'qualifies', 'supports', 'contradicts'}
QUALIFIERS = {'condition', 'grounds', 'references', 'scope', 'exceptions'}


def _shape(value, required, optional=()):
    if not isinstance(value, dict) or not set(required) <= value.keys() or set(value) - set(required) - set(optional):
        raise ValueError('Invalid qualified opinion structure; expected ' + ', '.join(required))


def _text(value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError('Qualified opinion text must be nonempty')


def _evidence(value):
    if not isinstance(value, list) or not value:
        raise ValueError('Qualified opinion requires exact source evidence')
    for quote in value:
        _text(quote)


def _voice(value):
    _shape(value, ('kind', 'label', 'evidence'))
    if value['kind'] not in {'collegial', 'individual', 'reported', 'undetermined'}:
        raise ValueError('Unknown opinion voice')
    _text(value['label'])
    _evidence(value['evidence'])


def _expression(expr, depth=0):
    if depth > 12 or not isinstance(expr, dict):
        raise ValueError('Invalid or overly nested condition')
    op = expr.get('op')
    if op == 'atom':
        _shape(expr, ('op', 'text', 'evidence'))
        _text(expr['text'])
        _evidence(expr['evidence'])
    elif op == 'not':
        _shape(expr, ('op', 'operand'))
        _expression(expr['operand'], depth + 1)
    elif op in {'all_of', 'any_of'}:
        _shape(expr, ('op', 'operands'))
        if not isinstance(expr['operands'], list) or len(expr['operands']) < 2:
            raise ValueError('A compound condition requires at least two operands')
        for operand in expr['operands']:
            _expression(operand, depth + 1)
    else:
        raise ValueError('Unknown condition operator')


def expression_text(expr):
    if expr['op'] == 'atom':
        return expr['text']
    if expr['op'] == 'not':
        return 'NON (' + expression_text(expr['operand']) + ')'
    joiner = ' E ' if expr['op'] == 'all_of' else ' O '
    return '(' + joiner.join(expression_text(e) for e in expr['operands']) + ')'


def validate(model):
    _shape(model, ('schema_version', 'profile', 'authorship', 'documents'))
    if type(model['schema_version']) is not int or model['schema_version'] != 1 or model['profile'] != PROFILE:
        raise ValueError('Unsupported qualified opinion profile')
    _text(model['authorship'])
    if not isinstance(model['documents'], list):
        raise ValueError('Qualified documents must be an array')
    documents = set()
    for doc in model['documents']:
        _shape(doc, ('unit_id', 'source_document_sha256', 'title', 'status', 'voice', 'nuclei', 'relations'), ('source_field', 'coverage_note', 'annex_sha256'))
        uid = doc['unit_id']
        if not isinstance(uid, str) or not re.fullmatch(r'R142_[0-9]{4}', uid) or uid in documents:
            raise ValueError('Invalid or duplicate qualified document')
        documents.add(uid)
        if not re.fullmatch(r'[a-f0-9]{64}', str(doc['source_document_sha256'])) or doc['status'] != 'proposed':
            raise ValueError('Qualified opinions must be proposed and source-bound')
        if 'annex_sha256' in doc and not re.fullmatch(r'[a-f0-9]{64}', str(doc['annex_sha256'])):
            raise ValueError('Invalid annex source hash')
        _text(doc['title'])
        if doc.get('source_field', 'text_diplomatic') not in {'text_diplomatic', 'regest_note'}:
            raise ValueError('Unsupported opinion source field')
        if 'coverage_note' in doc:
            _text(doc['coverage_note'])
        _voice(doc['voice'])
        if not isinstance(doc['nuclei'], list) or not doc['nuclei'] or not isinstance(doc['relations'], list):
            raise ValueError('Qualified document requires nuclei and a relation array')
        ids = set()
        for n in doc['nuclei']:
            _shape(n, ('id', 'object', 'stance', 'force', 'proposition', 'evidence', 'qualifications'), ('voice', 'source_field'))
            if 'source_field' in n and (n['source_field'] != 'text_annex' or 'annex_sha256' not in doc or 'voice' not in n):
                raise ValueError('Annex nucleus requires a bound annex and explicit voice')
            if 'voice' in n:
                _voice(n['voice'])
            if not isinstance(n['id'], str) or not re.fullmatch(re.escape(uid) + r'-N[1-9][0-9]*', n['id']) or n['id'] in ids:
                raise ValueError('Invalid or duplicate nucleus ID')
            ids.add(n['id'])
            for key in ('object', 'proposition'):
                _text(n[key])
            if n['stance'] not in STANCES or n['force'] not in FORCES:
                raise ValueError('Unknown stance or speech act')
            _evidence(n['evidence'])
            q = n['qualifications']
            _shape(q, (), QUALIFIERS)
            if 'condition' in q:
                c = q['condition']
                _shape(c, ('relation', 'expression', 'evidence', 'note'))
                if c['relation'] not in {'if_then', 'subject_to'}:
                    raise ValueError('Unknown conditional relation')
                _expression(c['expression'])
                _evidence(c['evidence'])
                _text(c['note'])
            for field in QUALIFIERS - {'condition'}:
                if field not in q:
                    continue
                if not isinstance(q[field], list):
                    raise ValueError('Qualification must be an array: ' + field)
                for statement in q[field]:
                    _shape(statement, ('kind', 'text', 'evidence'))
                    _text(statement['kind'])
                    _text(statement['text'])
                    _evidence(statement['evidence'])
        relation_ids = set()
        for r in doc['relations']:
            _shape(r, ('from', 'to', 'kind', 'text', 'evidence'))
            key = (r['from'], r['to'], r['kind'])
            if r['from'] not in ids or r['to'] not in ids or r['from'] == r['to'] or r['kind'] not in RELATIONS or key in relation_ids:
                raise ValueError('Invalid or duplicate nucleus relation')
            relation_ids.add(key)
            _text(r['text'])
            _evidence(r['evidence'])


def _bind(value, text, uid, source_field='text_diplomatic', source_texts=None):
    if isinstance(value, list):
        return [_bind(item, text, uid, source_field, source_texts) for item in value]
    if not isinstance(value, dict):
        return value
    if 'source_field' in value:
        source_field = value['source_field']
        text = (source_texts or {}).get(source_field) or ''
    result = {}
    for key, item in value.items():
        if key != 'evidence':
            result[key] = _bind(item, text, uid, source_field, source_texts)
            continue
        result[key] = []
        for quote in item:
            start = text.find(quote)
            if start < 0 or text.find(quote, start + 1) >= 0:
                raise ValueError(uid + ': absent or ambiguous source quote: ' + quote)
            result[key].append(dict(quote=quote, source_field=source_field,
                                    source_sha256=source_digest(text), span_start=start, span_end=start + len(quote)))
    return result


def simple_projection(doc):
    """A summary can omit evidence detail, but never conditionality or relations."""
    nuclei = []
    for n in doc['nuclei']:
        q = n['qualifications']
        summary = n['proposition']
        condition = q.get('condition')
        if condition:
            expr = expression_text(condition['expression'])
            if condition['relation'] == 'if_then':
                summary = 'SE ' + expr + ' → ALLORA: ' + summary
            else:
                summary += ' A CONDIZIONE CHE: ' + expr + '.'
        # Unconditional conclusions cannot be reconstructed by silently dropping these.
        for field, label in (('exceptions', 'Eccezioni'), ('scope', 'Precisazioni')):
            if q.get(field):
                summary += ' ' + label + ': ' + ' '.join(s['text'] for s in q[field])
        nuclei.append(dict(id=n['id'], object=n['object'], stance=n['stance'], force=n['force'],
                           voice=n.get('voice', doc['voice'])['label'],
                           summary=summary, conditional=bool(condition),
                           status='proposed', outcome_status='not_established'))
    return dict(composition='articulated' if len(nuclei) > 1 else 'single',
                voice=doc['voice']['label'], nuclei=nuclei,
                relations=[{k: r[k] for k in ('from', 'to', 'kind', 'text')} for r in doc['relations']])


def build(units, path):
    body = path.read_bytes()
    model = json.loads(body)
    validate(model)
    by_id = {u['unit_id']: u for u in units}
    documents = []
    for doc in model['documents']:
        uid = doc['unit_id']
        if uid not in by_id:
            raise ValueError('Unknown qualified unit: ' + uid)
        unit = by_id[uid]
        current = document_digest(unit) == doc['source_document_sha256']
        if 'annex_sha256' in doc:
            current = current and source_digest(unit.get('text_annex') or '') == doc['annex_sha256']
        field = doc.get('source_field', 'text_diplomatic')
        if current and field == 'regest_note' and unit.get('transcription_status') != 'regest':
            raise ValueError(uid + ': regest analysis requires a regest source')
        # Prior interpretations survive source changes, without being projected as current.
        compiled = _bind(doc, unit.get(field) or '', uid, field, unit) if current else copy.deepcopy(doc)
        compiled['source_field'] = field
        compiled['transcription_status'] = unit.get('transcription_status') if current else 'stale'
        compiled['source_status'] = 'current' if current else 'stale'
        compiled['simple'] = simple_projection(doc) if current else None
        compiled['outcome_status'] = 'not_established'
        documents.append(compiled)
    return dict(schema_version=1, profile=PROFILE, authorship=model['authorship'],
                source_sha256=hashlib.sha256(body).hexdigest(), documents=documents,
                summary=dict(documents=len(documents), nuclei=sum(len(d['nuclei']) for d in documents),
                             transcription_documents=sum(d['source_field'] == 'text_diplomatic' for d in documents),
                             regest_documents=sum(d['source_field'] == 'regest_note' for d in documents),
                             current_documents=sum(d['source_status'] == 'current' for d in documents),
                             stale_documents=sum(d['source_status'] == 'stale' for d in documents)))
