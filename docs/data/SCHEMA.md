# Data schema — as declared in the paper (§2)

Two datasets, joined on `unit_id`. The documentary dataset is stable and citable; the analytical dataset is versioned separately, so that hypotheses can evolve without altering the record of the source. Missing folio ranges are first-class **gap rows**.

## documentary.csv

| field | type | notes |
|---|---|---|
| register_id | string | constant `ASVe_CSM_142` (or project convention) |
| unit_id | string | `R142_NNNN`; join key; unique |
| folio_start / folio_end | string | foliation as inked (canonical) |
| date_original | string | as written, incl. *detto* ('ditto') references |
| date_iso | string | ISO 8601; *more veneto* converted only where the source marks m.v. |
| date_precision | string | e.g. day / month / year / inferred |
| marginal_note_raw | string | transcription of the marginal topic note |
| marginal_note_present | string | uncertainty vocabulary (see below) |
| signatories_raw / signatories_norm | string | as written / normalised |
| signatory_count | integer | |
| signatories_complete | string | uncertainty vocabulary |
| text_diplomatic | string | diplomatic transcription (ground truth where manual) |
| transcription_status | enum | operational vocabulary: manual_full / manual_partial / regest / not_transcribed / htr_raw / htr_aligned / reviewed / llm_scaffold_non_ground_truth (the paper presents the compact core manual / HTR / aligned / reviewed) |
| relation_type | enum | dissent_to / continuation_of / repeated_supplication / copy_of / same_dossier_as / response_to / correction_of (the paper cites the first two as examples) |
| related_unit_id | string | must reference an existing unit_id |

## analytical.csv

| field | type | notes |
|---|---|---|
| unit_id | string | join key; subset of documentary unit_ids |
| policy_domain | enum | values in `vocabularies/policy_domain.csv` |
| decision_orientation | enum | values in `vocabularies/decision_orientation.csv`; composite units: ordered multi-value with `\|` |
| document_trigger | enum | values in `vocabularies/document_trigger.csv` |
| actors / geography | string | gazetteer-normalised where possible |
| risk_terms / fiscal_terms / institutional_terms / monetary_expressions / deontic_formulas | string | rule-based extractions; hypotheses |
| *_status columns | enum | uncertainty vocabulary, per feature |

## Uncertainty vocabulary
`present` · `absent` · `not_visible` · `not_transcribed` · `not_checked` · `uncertain` · `not_applicable`

## Composite units
Default one unit = one operative decision. Multiple decisions: ordered `\|`-separated values in document order, flagged in notes. Conditions noted, no new vocabulary values. Individual (non-collegial) opinions flagged, unit not split. No deviation silently flattened.
Reconstruction extras: `date_check`, `foliation_note`, `uncertain_readings` (count of Isabella's "(?)" marks in text_diplomatic).
