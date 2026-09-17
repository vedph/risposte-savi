# The *Risposte* of the Cinque Savi alla Mercanzia - Register 142 (1607–1610)

**Modelling Early Modern Reasoning for the Venetian *Risposte*: A Scalable Framework**

**Third release — 2026-09-16** (dataset snapshot `dataset-2026-09-16`).

This repository contains the dataset, controlled vocabularies, lexica and extraction procedures of a pilot study that models the *Risposte* — advisory opinions drafted by the Cinque Savi alla Mercanzia for the Venetian Senate (1540–1733), preserved at the Archivio di Stato di Venezia — as documentary units described in structured form. The study covers register 142 (1607–1610). The single signed *Risposta* is the primary decision unit; a two-layer data model separates a source-near documentary core from an analytical layer of interpretive categories, recorded with explicit uncertainty states and a review status. A third layer, the qualified model of the opinions, describes each response as a set of nuclei with voices, conditions, grounds and links, each supported by quoted passages.

Project site: https://vedph.github.io/risposte-savi/

## What changed in this release

- The diplomatic transcriptions (Isabella Cecchini) were reread against the digitisations of the register with the assistance of a language model and checked by the curator. Every changed reading is recorded in the unit (`transcription_corrections`: previous reading, current reading, folio, digitisation, agent, date). Three responses absent from the July releases and the beginning of one more were transcribed from the digitisations (`text_source: facsimile_2026`). Signatures, marginal notes, absences and vote annotations were read into their own fields. See `METHOD-AI.md`.
- The qualified model of the opinions (238 nuclei in 64 records) is published with its glyphs and interactive graphs, in Italian and English.
- Unit identifiers were renumbered in the physical order of the register (see below).
- The site has a Method page and no longer carries per-unit workflow badges.

## Identifiers

Unit identifiers `R142_0001`–`R142_0064` follow the physical order of the register (folio, then date). The identifiers used in the July 2026 releases and in the EADH 2026 paper are kept in each unit as `legacy_id`; the two series are not interchangeable. The register is not fully inventoried: responses seen on the digitisations but not yet transcribed are absent, and the numbering will be extended as they are added.

## Reproducible build

Canonical inputs are in `data/source/` (`units.json`, `hypotheses.csv`, `qualified_opinions.json`) and `data/i18n/en.json`; current CSV, JSON, JavaScript and ZIP outputs are generated together. The website is `docs/` (served by GitHub Pages); `docs/data/` holds the generated files it loads.

```sh
python3 scripts/pipeline.py build
python3 scripts/pipeline.py check
python3 scripts/audit_transcriptions.py
python3 -m unittest discover -s tests -v
pnpm install --frozen-lockfile
pnpm test
```

Python 3.10+ is sufficient for data processing (no third-party packages). Interface tests use Node 22+ and the locked pnpm dependencies. The generated transcription QA report (`data/transcription_quality.json`) flags passages for image comparison; its structural and HTR checks are triage, not a substitute for philological verification.

```
data/source/            documentary source JSON, analytical audit CSV, qualified model
data/i18n/              English presentation dictionary for editorial texts
data/vocabularies/      controlled vocabularies
data/lexica/            experimental extraction lexica
data/ner/               name authorities and reconciliations used by the extractor
data/                   the published dataset (CSV, JSON, schema, provenance, download archive)
scripts/pipeline.py     single build/check implementation
scripts/                extraction, qualified-model compilation, translations
tests/                  data and import regression tests
tests_site.js           offline DOM tests of the public pages
docs/                   maintained bilingual static site; docs/data/ holds the files the site loads
```

## Project site

The website adapts the static-site model previously developed for the VeDPH Venice Summer School repository (https://github.com/vedph/vessdph2026), reworking it for an archival-historical research dataset: data-driven pages generated from the released files, with the layers of the model rendered in the interface (documentary values solid, rule-extracted values dashed, nuclei with their own glyphs).

## The datasets

- **`documentary.csv`** records what the source supplies: identifiers, folios, dates, marginal notes, signatories, diplomatic text, transcription status, typed relations between units. It is stable and citable as a record of the source.
- **`analytical.csv`** records what rule-based extraction supplies: policy domain, decision orientation, trigger, actors, geography, extracted lexical features. Every value carries its rule, evidence, an explicit uncertainty state and a review status. `hypotheses.csv` is the audit table behind it, including rejected and superseded records.
- **`qualified_opinions.json`** records the qualified model of the opinions: for each unit, its nuclei (object, stance, speech act, proposition), voices, conditions, grounds, references and typed links, each with quoted evidence bound to the source text by hash. Interpretations become stale, not silently updated, when the source text changes.
- **`units.json`** is the generated site data (documentary and analytical fields, HTR output, signatories, reliability class, per-unit CER/WER, revision notes and corrections).

The corpus is a selection, not a complete inventory. Early digitisation labels differ from the written foliation of the manuscript; records keep the references of the working index, explicitly labelled as such, and archival coverage fields are null in the release manifest. The legacy calculation is separately available as `reference_coverage`. The EADH 2026 paper reports 61 units and approximately 51% coverage; the July 15 metadata reports 97/192. These published claims are preserved as historical statements. See [provenance](data/PROVENANCE.md) and [release manifest](data/release.json).

## Documentary layer — fields

`register_id` · `unit_id` · `legacy_id` · `folio_start` · `folio_end` · `date_original` · `date_iso` · `date_precision` · `marginal_note_raw` · `marginal_note_present` · `signatories_raw` · `signatories_norm` · `signatory_count` · `signatories_complete` · `text_diplomatic` · `text_source` (`working_doc` / `carte_contigue` / `facsimile_2026`) · `transcription_status` (`manual_full` / `manual_partial` / `regest` / `not_transcribed`) · `relation_type` (e.g. `dissent_to`, `same_dossier_as`) · `related_unit_id` · `relation_status`

Dissent and continuation are encoded as typed links: a dissenting opinion is a unit of its own, linked through `relation_type = dissent_to` to the unit it contests; a probable relation is recorded as `probable`, never as identity. Dates in *more veneto* are converted only where the source marks *m.v.*; date anomalies are flagged in `date_check`, not corrected.

## Analytical layer — fields

`policy_domain` · `decision_orientation` · `document_trigger` · `actors` · `geography` · `risk_terms` · `fiscal_terms` · `institutional_terms` · `monetary_expressions` · `deontic_formulas`

Controlled values are listed in `data/vocabularies/`. The extraction (`scripts/ner.py`, `scripts/reasoning.py`, `scripts/opinion_extraction.py`) detects names, places, institutions, opinion, request, prediction and preference formulas, grammatical negation and some explicit conditional boundaries; it abstains from resolving historical speaker identity and compound Boolean scope, and it does not call a language model. The qualified nuclei are not the output of that extractor.

## Uncertainty vocabulary

Seven uncertainty states, applied per feature (separate from `*_review_status`): `present` · `absent` · `not_visible` · `not_transcribed` · `not_checked` · `uncertain` · `not_applicable` (definitions in `data/vocabularies/uncertainty_states.csv`).

## Evidence discipline

- The documentary baseline is the manual diplomatic transcription (Isabella Cecchini). The September 2026 revision on the digitisations is recorded reading by reading, with provenance; readings that could not be settled keep the mark (?). HTR output enters only as a separate technical layer.
- Analytical values are interpretive constructs, recorded with explicit uncertainty states and their evidence.
- Corrections are always surfaced with their provenance, never merged silently.

## ATR workflow

Ground truth: manual diplomatic transcription (Isabella Cecchini). Baseline recognition: Transkribus (Text Titan I ter supermodel); alignment and open model training: eScriptorium/Kraken; interchange: PAGE XML. First figures from the pipeline (Federico Boschetti, CNR-ILC / CLARIN-IT): segmentation error ≈3%; text-recognition CER ≈15%, computed at model creation on a 90/10 split of the current ground truth (ten *carte*, twenty pages). The archived unit-level evaluation (`data/htr_evaluation_report.md`) reports a micro-aggregated CER of 9.8% and WER of 28.2% on 27 units; samples, aggregation and procedures differ.

## Images and rights

Digitisations of ASVe, Cinque Savi alla Mercanzia, reg. 142 were taken by Isabella Cecchini with the permission of the Archivio di Stato di Venezia. Full-page facsimiles are **not** distributed in this repository; only word-level specimina appear on the project site, under the same permission. *Su concessione dell'Archivio di Stato di Venezia; ulteriore riproduzione vietata.*

## Credits

Author contributions ([CRediT](https://credit.niso.org/)): **Emmanuela Carbé** — conceptualization, methodology, data curation, software (Registro Savi platform), writing (original draft; review and editing). **Isabella Cecchini** — investigation, resources (diplomatic transcription, photographic digitisation), validation, writing (original draft). **Federico Boschetti** — methodology (ATR workflow), software, writing (original draft).

The authors used generative AI to assist drafting, to prototype controlled vocabularies and extraction heuristics, to develop the Registro Savi platform, and, in September 2026, as an aid in rereading the transcriptions against the digitisations and in formulating the qualified model of the opinions (see `METHOD-AI.md`); all outputs were reviewed by the authors, who are responsible for them.

## Licence

Code and scripts: MIT (see `LICENSE`). Data and documentation: CC BY 4.0 (per-object rights in `docs/RIGHTS.md`).
