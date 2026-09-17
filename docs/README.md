# Risposte: maintained project website

This directory is the bilingual static site. Current data describe 64 units (release 2026-09-16);
`data/release.json` and `data/PROVENANCE.md` give reproducible counts and open
editorial questions. The July 2 ZIP and dated source CSVs are historical snapshots.

Edit HTML and assets here. From the repository root, run:

```sh
python3 scripts/pipeline.py build
python3 scripts/pipeline.py check
python3 -m unittest discover -s tests -v
pnpm install --frozen-lockfile
pnpm test
python3 -m http.server 8000 --directory docs
```

The build reads `data/source/` at repository root, generates both current data
copies and mirrors the site to root for existing Pages configurations. Do not
edit generated CSV/JSON/JS files. `CONTRIBUTING.md` at repository root documents
incoming packets, explicit review decisions, source history and recovery.

`kb/` is a historical 53-unit export, not a current view of the release. Older
extraction/knowledge-base scripts remain experimental. The compatibility
`build_units.py` entry points now invoke the current checked build.

No manuscript facsimile is added by this build. Rights, contribution and citation
statements remain in `RIGHTS.md`, `about.html` and `CITATION.cff`.
