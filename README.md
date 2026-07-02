# The *Risposte* of the Cinque Savi alla Mercanzia — Register 142 (1607–1610)

**Modelling Early Modern Reasoning for the Venetian *Risposte*: A Scalable Framework**

**First public prototype — 2026-07-02** (dataset snapshot `dataset-2026-07-02`).

This repository contains the dataset, controlled vocabularies, lexica and extraction procedures of a pilot study that models the *Risposte* — advisory opinions drafted by the Cinque Savi alla Mercanzia for the Venetian Senate (1540–1733), preserved at the Archivio di Stato di Venezia — as documentary units described in structured form. The prototype covers register 142 (1607–1610). The single signed *Risposta* is the primary decision unit; a two-layer data model separates a source-near documentary core from an analytical layer of interpretive categories, recorded as hypotheses with explicit uncertainty states and subject to expert validation.

Project site: https://vedph.github.io/risposte-savi/

## Repository structure

```
data/
  documentary.csv        source-near documentary dataset (stable, citable)
  analytical.csv         interpretive analytical dataset (versioned separately)
  vocabularies/          controlled vocabularies (policy_domain, decision_orientation,
                         document_trigger, uncertainty_states)
  lexica/                deontic formulas and fiscal lexicon, with English glosses
scripts/
  split_datasets.py            partitions the master workbook into the two datasets
  derive_datasets_from_v06.py  derives documentary.csv / analytical.csv from the source CSV
  validate_datasets.py         consistency gate (exit != 0 on error)
  ingest_and_rebuild.py        ingests deposits from incoming/ and regenerates the site data
incoming/                deposit area for new transcriptions / ATR output (see workflow)
.github/workflows/       rebuild.yml - ingests incoming/ deposits, validates, regenerates
docs/                    static project site (GitHub Pages); docs/review.html is the
                         internal editorial workbench (noindex)
```

## Project site

This website adapts the static-site model previously developed for the VeDPH Venice Summer School repository (https://github.com/vedph/vessdph2026), reworking it for an archival-historical research dataset on the *Risposte* of the Cinque Savi alla Mercanzia: data-driven pages generated from the released CSVs, with the two-layer model rendered in the interface (documentary values solid, analytical values shown as pending hypotheses).

## The two datasets

The two layers of the model are released as **two distinct datasets, joined on `unit_id`**:

- **`documentary.csv`** records what the source supplies: identifiers, folios, dates, marginal notes, signatories, diplomatic text, transcription status, typed relations between units. It is stable and citable as a record of the source.
- **`analytical.csv`** records what the analyst supplies: policy domain, decision orientation, trigger, actors, geography, extracted lexical features. Every value is a hypothesis, carries an explicit uncertainty state, and remains subject to expert validation. This dataset is versioned separately, so that interpretive hypotheses can evolve without altering the documentary record.

Missing folio ranges are modelled explicitly as first-class **gap rows**, never as silent absences. The dataset records 53 units and 23 first-class gap rows. Folio-level register coverage, computed from the canonical `folio_sides` of the released dataset, is ≈41% (78 of 192 folios); this supersedes the ≈53% early estimate cited in the submitted paper, to be corrected at the next upload (see `data/PROVENANCE.md`).

## Documentary layer — fields

`register_id` · `unit_id` · `folio_start` · `folio_end` · `date_original` · `date_iso` · `date_precision` · `marginal_note_raw` · `marginal_note_present` · `signatories_raw` · `signatories_norm` · `signatory_count` · `signatories_complete` · `text_diplomatic` · `transcription_status` (manual / HTR / aligned / reviewed) · `relation_type` (e.g. `dissent_to`, `continuation_of`) · `related_unit_id`

Dissent and continuation are encoded as typed links: a dissenting opinion is a unit of its own, linked through `relation_type = dissent_to` to the unit it contests; a continuation points back to the block it extends.

## Analytical layer — fields

`policy_domain` · `decision_orientation` · `document_trigger` · `actors` · `geography` · `risk_terms` · `fiscal_terms` · `institutional_terms` · `monetary_expressions` · `deontic_formulas`

Controlled values are listed in `data/vocabularies/`. Dates in *more veneto* are converted only where the source explicitly marks *m.v.*; date anomalies are flagged, not corrected.

## Composite units (convention)

Default: one row = one *Risposta* = one operative decision; `decision_orientation` holds a single controlled value. Where one signed text contains several operative decisions, values are recorded in document order, separated by `|` (e.g. `grant|deny`), with a flag in the notes. Conditional decisions keep the operative outcome in `decision_orientation`; the condition is noted, and no new vocabulary values are introduced. Individual (non-collegial) opinions are flagged, and the unit is not split. Distinct matters bundled by a segmentation error are corrected as segmentation, with provenance. No deviation from the one-unit–one-decision default is silently flattened. The planned refinement of the schema separates the documentary container from the deliberative acts it hosts, each with its own orientation and signatories.

## Uncertainty vocabulary

Seven states, applied per feature: `present` · `absent` · `not_visible` · `not_transcribed` · `not_checked` · `uncertain` · `not_applicable` (definitions in `data/vocabularies/uncertainty_states.csv`).

## Extraction procedures

Population and quality control are rule-based (Python): regular expressions for dates, folio references, signatories and monetary expressions; controlled-vocabulary matching for deontic formulas and the fiscal lexicon (`data/lexica/`); a gazetteer for institutional actors; TF-IDF and cosine similarity for exploratory clustering and quality control. Automated outputs enter the dataset only as flagged hypotheses for expert validation.

## Evidence discipline

- The dataset's ground truth consists exclusively of the manual diplomatic transcription; automated outputs enter only as flagged hypotheses.
- Analytical values are interpretive constructs, recorded with explicit uncertainty states.
- Corrections are always surfaced with their provenance, never merged silently.

## ATR workflow

Ground truth: manual diplomatic transcription (Isabella Cecchini). Baseline recognition: Transkribus (Text Titan I ter supermodel); alignment and open model training: eScriptorium/Kraken; interchange: PAGE XML. First figures from the pipeline (Federico Boschetti, CNR-ILC / CLARIN-IT): segmentation error ≈3%; text-recognition CER ≈15%, computed at model creation on a 90/10 split of the current ground truth (ten *carte*, twenty pages). Enlarging the manually corrected ground truth is the immediate priority.

## Images and rights

Photographs of ASVe, Cinque Savi alla Mercanzia, reg. 142 were taken by Isabella Cecchini with the permission of the Archivio di Stato di Venezia. Full-page facsimiles are **not** distributed in this repository; only word-level specimina appear on the project site, under the same permission. *Su concessione dell'Archivio di Stato di Venezia; ulteriore riproduzione vietata.*

## Credits

Author contributions ([CRediT](https://credit.niso.org/)): **Emmanuela Carbé** — conceptualization, methodology, data curation, software (Registro Savi platform), writing (original draft; review and editing). **Isabella Cecchini** — investigation, resources (diplomatic transcription, photographic digitisation), validation, writing (original draft). **Federico Boschetti** — methodology (ATR workflow), software, writing (original draft).

The authors used generative AI to assist drafting, to prototype controlled vocabularies and extraction heuristics, and to develop the Registro Savi platform (Anthropic Claude Opus 4.8), with a final consistency check of the workflow (Anthropic Claude Fable 5); all outputs were reviewed and verified by the authors.

## Licence

Code and scripts: MIT (see `LICENSE`). Data and documentation: CC BY 4.0 (per-object rights in `docs/RIGHTS.md`).

## How to cite

See `CITATION.cff`.

<sub>The word-level clippings on the site home page show the hand of reg. 142 (ASVe, Cinque Savi alla Mercanzia); see docs/RIGHTS.md.</sub>
