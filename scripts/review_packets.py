"""Strict packet shapes and source anchors shared by release and import code."""
from math import isfinite
try:
    from .text_matching import source_digest
except ImportError:
    from text_matching import source_digest

ANCHOR_COLUMNS = ['source_field', 'span_start', 'span_end', 'source_sha256',
                  'surface', 'extractor', 'authority_sha256', 'candidate_id']
SOURCE_FIELDS = {'text_diplomatic', 'marginal_note_raw', 'signatories_raw', 'regest_note'}


def hypothesis_key(row):
    return tuple(str(row.get(k, '')) for k in
                 ['unit_id', 'feature', 'value', 'rule', 'evidence'] + ANCHOR_COLUMNS[:4])


def validate_anchor(row, unit):
    """Reject partial anchors and stale/misaligned evidence; no source correction."""
    if not any(row.get(k, '') != '' for k in ANCHOR_COLUMNS):
        return
    field = row.get('source_field')
    if field not in SOURCE_FIELDS:
        raise ValueError('Invalid hypothesis source_field')
    text = unit.get(field) or ''
    try:
        start, end = int(row['span_start']), int(row['span_end'])
    except (KeyError, TypeError, ValueError):
        raise ValueError('Invalid hypothesis source span') from None
    if str(start) != str(row['span_start']) or str(end) != str(row['span_end']):
        raise ValueError('Source spans must be integer offsets')
    if not 0 <= start < end <= len(text) or text[start:end] != row.get('surface'):
        raise ValueError('Hypothesis surface does not match the source span')
    if source_digest(text) != row.get('source_sha256'):
        raise ValueError('Hypothesis source changed; re-extract before review')
    if row.get('evidence', '') not in text or not row.get('evidence'):
        raise ValueError('Hypothesis evidence is not an exact source excerpt')
    evidence = row['evidence']
    context_start = text.find(evidence, max(0, end - len(evidence)), start + len(evidence))
    if context_start < 0 or context_start > start or context_start + len(evidence) < end:
        raise ValueError('Hypothesis evidence does not contain its source span')


def validate_packet_shape(packet):
    if not isinstance(packet, dict):
        raise ValueError('Review packet must be a JSON object')
    allowed = {'version', 'transcriptions', 'new_units', 'validations', 'new_hypotheses', 'reviewer', 'note'}
    if set(packet) - allowed:
        raise ValueError('Unknown packet keys: ' + ', '.join(sorted(set(packet) - allowed)))
    if 'version' in packet and (type(packet['version']) is not int or packet['version'] != 1):
        raise ValueError('Unsupported packet version')
    for key in ('reviewer', 'note'):
        if key in packet and not isinstance(packet[key], str):
            raise ValueError(key + ' must be a string')
    for key in ('new_units', 'validations', 'new_hypotheses'):
        if key in packet and (not isinstance(packet[key], list) or
                              any(not isinstance(x, dict) for x in packet[key])):
            raise ValueError(key + ' must be an array of objects')
    if 'transcriptions' in packet and not isinstance(packet['transcriptions'], dict):
        raise ValueError('transcriptions must be an object')
    for update in packet.get('transcriptions', {}).values():
        if not isinstance(update, (str, dict)):
            raise ValueError('Transcription update must be a string or object')


def finite_metric(value, name):
    if isinstance(value, bool):
        raise ValueError('Invalid ' + name)
    try:
        number = float(value)
    except (ValueError, TypeError):
        raise ValueError('Invalid ' + name) from None
    if number < 0 or not isfinite(number):
        raise ValueError('Invalid ' + name)
    return number
