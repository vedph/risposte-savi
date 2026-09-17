#!/usr/bin/env python3
"""Extract auditable NER candidates without modifying the source or audit table."""
import argparse
import json
from pathlib import Path
import sys

from ner import EntityRecognizer, extract_corpus
from pipeline import ROOT, json_bytes, load_sources, publish


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--unit', action='append', help='Unit ID; repeat to select several units')
    parser.add_argument('--include-regests', action='store_true', help='Extract separately labelled summaries too')
    parser.add_argument('--output', type=Path, help='Output JSON path; default: stdout')
    args = parser.parse_args()
    try:
        source, _ = load_sources(ROOT)
        units = source['units']
        if args.unit:
            unknown = set(args.unit) - {u['unit_id'] for u in units}
            if unknown:
                raise ValueError('Unknown unit: ' + ', '.join(sorted(unknown)))
            units = [u for u in units if u['unit_id'] in args.unit]
        report = extract_corpus(units, EntityRecognizer(), args.include_regests)
        if args.output:
            path = args.output.resolve()
            if path.exists():
                raise ValueError('Output already exists; choose a new path')
            path.parent.mkdir(parents=True, exist_ok=True)
            publish(path.parent, {path.name: json_bytes(report)})
        else:
            sys.stdout.write(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    except (ValueError, OSError) as exc:
        parser.exit(1, str(exc) + '\n')


if __name__ == '__main__':
    main()
