"""Print the deterministic transcription QA report for the canonical source."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))

from pipeline import audit_transcriptions, load_sources  # noqa: E402


def main() -> None:
    source, _ = load_sources(ROOT)
    report = audit_transcriptions(source['units'])
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
