# The Risposte of the Cinque Savi alla Mercanzia - reg. 142 (1607-1610)

Research website and **dataset prototype** for the *Risposte* (advisory opinions) of the
Venetian Cinque Savi alla Mercanzia, register 142, Archivio di Stato di Venezia:
53 documentary units in archival order, described in structured form, with the manual diplomatic transcription as the
primary documentary text where available, the uncollated HTR output kept as a separate
technical layer, and an analytical layer of **flagged hypotheses** with cited evidence.
Static site, bilingual (EN/IT), offline-capable, no backend.

**First public prototype — 2026-07-02.**

**Companion to the EADH 2026 paper** *Modelling Early Modern Reasoning for the Venetian
Risposte: A Scalable Framework* (E. Carbé, F. Boschetti, I. Cecchini).

## Structure

```
data/       canonical CSV (reg142_units_v06.csv), schema.csv (data dictionary),
            hypotheses.csv (flat provenance), units.js/json (generated),
            journal.js (dataset journal), htr_evaluation_report.md,
            downloads/ (dataset snapshot zip)
tools/      build_units.py (CSV -> units.js/json + hypotheses.csv)
            extraction.py (rule lexica; every value carries rule id + evidence span)
            build_kb.py / validate_kb.py (knowledge base + CI check)
kb/         markdown+YAML knowledge base: units, concept scope notes, model notes
assets/     app.js, i18n.js, style.css, self-hosted fonts (OFL), Leaflet, word clippings
*.html      index · register · corpus · unit · names · model · decision · data · colophon
```

## Build & deploy

```
python tools/build_units.py     # CSV -> data/units.js, units.json, hypotheses.csv
python tools/build_kb.py        # -> kb/
python tools/validate_kb.py     # CI gate (exit != 0 on error)
```
Deploy: push to GitHub, enable Pages on the repo root (`.nojekyll` included).
Everything is regenerable from the canonical CSV; generated files are committed
so Pages needs no build step.

## Evidence discipline (the point of the prototype)

Validated manual transcription (I. Cecchini) is the primary documentary text and is
never reversed by model output. Documentary fields carry uncertainty states; anomalies
are flagged, never silently corrected; *more veneto* is applied only where the source
marks it. The HTR output is displayed uncollated, as a separate technical layer, with
measured or estimated error. Analytical values are **rule-extracted hypotheses**
(rule id + evidence span + `pending_expert_validation`); dashed marks in the interface
always mean hypothesis. On the use of AI tools, see `METHOD-AI.md`.

## Credits · rights · citation

CRediT roles and partners in the site colophon; per-object rights in `RIGHTS.md`;
citation metadata in `CITATION.cff`.
