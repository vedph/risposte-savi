"""Build source-grounded research dossiers, without automatic identity assertions."""
import json
import re
import hashlib
from collections import defaultdict
from urllib.parse import quote
try:
    from .text_matching import matching_text
except ImportError:
    from text_matching import matching_text


def document_digest(unit):
    """Bind research to the reading, dating and foliation that were consulted."""
    keys = ('text_diplomatic', 'marginal_note_raw', 'signatories_raw', 'regest_note',
            'date_iso', 'date_original', 'folio_raw', 'transcription_status')
    return hashlib.sha256(json.dumps({k: unit.get(k) or '' for k in keys},
                                    ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()


def build_contexts(units, candidates, reconciliation_path):
    research = json.loads(reconciliation_path.read_text(encoding='utf-8'))
    if research.get('schema_version') != 1:
        raise ValueError('Unsupported reconciliation schema')
    by_id = {u['unit_id']: u for u in units}
    research_current = {uid: research.get('source_documents', {}).get(uid) == document_digest(unit)
                        for uid, unit in by_id.items()}
    grouped = defaultdict(list)
    for candidate in candidates:
        grouped[candidate['unit_id'], candidate['source_field']].append(candidate)
    dossiers = []
    for candidate in candidates:
        unit = by_id[candidate['unit_id']]
        field = candidate['source_field']
        text = unit.get(field) or ''
        a, b = candidate['span_start'], candidate['span_end']
        prefix = matching_text(text[max(0, a - 35):a], expansions=True).text
        deceased = bool(re.search(r'(?:\bq\.|\bqvondam)\s+(?:d\.\s+)?$', prefix))
        near = text[max(0, a - 120):min(len(text), b + 180)]
        years = sorted(set(re.findall(r'\b(?:1[0-9]{3}|20[0-9]{2})\b', near)))
        nearby = [dict(label=x['label'], value=x['value']) for x in grouped[candidate['unit_id'], field]
                  if x['candidate_id'] != candidate['candidate_id']
                  and x['span_start'] < b + 180 and x['span_end'] > a - 120]
        matches = []
        for entry in research['entries']:
            if candidate['unit_id'] not in entry['scope_unit_ids'] or candidate['label'] != entry['label']:
                continue
            if not research_current[candidate['unit_id']]:
                continue
            variants = {matching_text(v).text for v in entry['aliases']}
            if matching_text(candidate['surface']).text not in variants:
                continue
            match = dict(entry, chronology='not_assessed')
            date = unit.get('date_iso', '')
            year = int(date[:4]) if re.match(r'^[0-9]{4}', date) else None
            if year and entry.get('death_year') and year > entry['death_year']:
                match['chronology'] = 'posthumous_reference_supported' if deceased else 'historical_reference_requires_review'
            matches.append(match)
        name = candidate['value']
        query = '"' + name + '" Venezia ' + (unit.get('date_iso') or '1607 1610')[:4]
        dossiers.append(dict(candidate_id=candidate['candidate_id'], document_date=unit.get('date_iso', ''),
                             folio_raw=unit.get('folio_raw', ''), deceased_marker=deceased,
                             nearby_years=years, nearby_entities=nearby, reconciliations=matches,
                             status='proposed' if matches else 'not_reconciled',
                             research_links=[
                                 dict(title='Google Books · ricerca contestuale', url='https://books.google.com/books?q=' + quote(query)),
                                 dict(title='Wikidata · ricerca del nome', url='https://www.wikidata.org/w/index.php?search=' + quote(name))],
                             note='Co-occurrence is a search clue, not a historical relationship. Search links are not consulted sources.'))
    notes = [dict(n, stale=not research_current.get(n['unit_id'], False))
             for n in research.get('document_notes', [])]
    return dict(schema_version=1, checked_at=research['checked_at'], dossiers=dossiers,
                research_sha256=hashlib.sha256(reconciliation_path.read_bytes()).hexdigest(),
                document_notes=notes,
                summary=dict(mentions=len(dossiers), with_external_proposals=sum(bool(d['reconciliations']) for d in dossiers)))
