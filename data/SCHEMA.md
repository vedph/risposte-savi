# Data schema — as declared in the paper (§2)

## Qualified opinions (additional interpretation layer)

`qualified_opinions.json` contains 61 assistant-interpreted documents and 221
nuclei, separate from the existing hypothesis audit. Each nucleus has an ID,
object, stance, speech act, proposition and exact evidence. Optional qualifications
record conditions (`atom`, `all_of`, `any_of`, `not`), grounds, references, scope
and exceptions. Typed relations join nuclei in the same document. Documents
specify `source_field` (`text_diplomatic` or `regest_note`) and optional
`coverage_note`. A nucleus can override `voice`. Annex nuclei require an explicit
voice and `source_field: text_annex`, plus a document-level `annex_sha256`.
The `force` vocabulary also includes `request`, `topic` and `report`, so regests
and reported positions are not silently promoted to Savi recommendations.
The document-level source hash binds reading and metadata; an annex hash separately
invalidates the current projection when the annex changes.
The `simple` projection retains conditions, exceptions, scope, voice and modality;
it is null when `source_status` is `stale`. Evidence offsets count Unicode code
points, starting at zero with an exclusive end. Cases remain `proposed` and
`outcome_status` is `not_established`. Authorship and source hashes are explicit.
The maintained input is `data/source/qualified_opinions.json`; the complete
profile and limits are documented in the repository's `QUALIFIED_MODEL.md`.

## Original documentary and analytical datasets

Two datasets, joined on `unit_id`. The documentary dataset is stable and citable; the analytical dataset is versioned separately, so that hypotheses can evolve without altering the record of the source. Missing folio ranges are first-class **gap rows**.

## documentary.csv

| field | type | notes |
|---|---|---|
| register_id | string | constant `ASVe_CSM_142` (or project convention) |
| unit_id | string | `R142_NNNN` (records, in the physical order of the register since 2026-09-16), `R142_GNNN` (generated gap ranges); unique within snapshot |
| legacy_id | string | identifier of the same record in the July 2026 releases (empty for records added later) |
| folio_start / folio_end | string | normalized working reference; not yet reconciled with manuscript foliation |
| date_original | string | as written, incl. *detto* ('ditto') references |
| date_iso | string | ISO 8601; *more veneto* converted only where the source marks m.v. |
| date_precision | string | e.g. day / month / year / inferred |
| marginal_note_raw | string | transcription of the marginal topic note |
| marginal_note_present | string | uncertainty vocabulary (see below) |
| signatories_raw / signatories_norm | string | as written / normalised |
| signatory_count | integer | |
| signatories_complete | string | uncertainty vocabulary |
| text_diplomatic | string | diplomatic transcription |
| text_source | enum | working_doc (I. Cecchini's working document) / carte_contigue (contiguous folios 29v-39v, June 2026) / facsimile_2026 (read from the digitisations in the September 2026 revision) |
| revision_notes | array | notes of the September 2026 revision on the digitisations (folio, digitisation, readings), kept apart from editorial_notes |
| transcription_corrections | array | one record per changed reading: field, previous, reading, agent, date, folio, image, note |
| transcription_status | enum | operational vocabulary: manual_full / manual_partial / regest / not_transcribed / htr_raw / htr_aligned / reviewed (the paper presents manual_full / manual_partial / regest / not_transcribed) |

The diplomatic transcription preserves `etc.` when it appears in the source or
in the established transcription formula (for example `Habbiamo noi etc.` or
the closing `rimettendosi etc.`). That token alone does not mean that a passage
was omitted. A genuinely incomplete transcription is marked `manual_partial`
and/or with an explicit omission flag or ellipsis; completeness is therefore
not inferred from the presence of `etc.`.
| relation_type | enum | dissent_to / continuation_of / repeated_supplication / copy_of / same_dossier_as / response_to / correction_of (the paper also discusses repeated_supplication) |
| related_unit_id | string | must reference an existing unit_id |

The public unit page renders a **Connected opinions** block beneath the text.
It combines the documentary relation fields above (including reciprocal links)
with explicit `R142_NNNN` cross-references found in editorial notes. These links
are navigation aids and editorial provenance; they do not add documentary claims
or NLP graph edges to the record.

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

## Current implementation and audit fields

The authoritative inputs are `data/source/units.json` and `data/source/hypotheses.csv`. Historical CSVs are retained as snapshots, not rebuild inputs.

Documentary additions: `folio_raw` preserves unresolved source notation; `foliation_status` and `foliation_note` record unresolved localization; `relation_status` records uncertainty independently of the relation type; `relation_source` and `validation_status` preserve provenance and pending expert review. Gap IDs (`R142_GNNN`) are generated ranges and may change when coverage changes; cite the snapshot with these IDs. Record IDs (`R142_NNNN`) were renumbered once, on 2026-09-16, in the physical order of the register; `legacy_id` keeps the July 2026 identifier. Missing normalized fields are not fabricated.

The source also retains inverse relation labels `continuation` and `corrected_by`; these are not silently converted into their oppositely directed relations. An unresolved target requires explicit `uncertain` status plus a source note. `signatories_complete` describes documentary uncertainty; it does not imply that normalized personal names were verified.

Every analytical feature has two distinct columns:

- `*_status`: one of the seven uncertainty states. Current proposals are `uncertain`; accepted active values are `present`; no current candidate is `not_checked`, not `absent`.
- `*_review_status`: `pending_expert_validation`, `validated`, or `not_checked`. Multiple values are validated only if all contributing active records were reviewed.

`hypotheses.csv` uses `unit_id,feature,value,rule,confidence,evidence,decision,new_value,reviewer,reviewed_at`. `decision` is blank, `accept`, `reject`, `reformulate` or `superseded`. Original values remain intact; reformulations use `new_value` in active projections. Prior audit tables are preserved on import in source history. Review state is independent of presence/absence and never an eighth uncertainty state.

The first archival revision received on 15 September 2026 establishes a mismatch between early digitisation labels and manuscript foliation. `folio_raw`, `folio_start`, `folio_end` and `folio_sides` preserve the old working references. A systematic offset must not be applied without a concordance identifying the exact transition and individual boundaries.

Release manifest schema 2 and `units.json.meta` expose `coverage_status: "unreconciled_foliation"`. The archival coverage fields (`coverage_carte`, `coverage_folios`, `coverage_percent`, `total_folios`; manifest `covered_folios`, `total_folios`) are **null**, not zero. Consumers must not substitute a percentage or a denominator of 192. `reference_coverage` separately contains `reference_system`, `covered_numbers`, `extent`, `ratio`, and `percent`: these describe the legacy index only (currently 93 distinct numbers within 1–192). Historical `coverage_reported` is retained.

Generated gap rows complement the legacy reference numbers; `gaps.js` declares their `reference_system`. They do not identify missing responses, missing images or blank manuscript leaves. In the documentary CSV their historical `not_transcribed` value is retained for compatibility and has no evidential force about the physical register. Five records also have individually unresolved localization. The first revision does not confirm the full inventory, total physical folios or all editorial hypotheses.

## transcription_quality.json

## NER proposals and contextual research

`ner_candidates.json` contains an extractor version, authority SHA-256, source
fingerprints, summary and `candidates`. Each candidate has `label` (PER/LOC/ORG),
`feature`, proposed `value`, exact `surface`, `source_field`, `span_start`,
`span_end`, evidence with context bounds, a stable `candidate_id`, rule and
pending review status. Offsets are zero-based Unicode code points, end-exclusive.
`confidence` is an uncalibrated heuristic label, not a probability of correctness.
Repeated occurrences have distinct IDs. Source text is never normalized in place.

`hypotheses.csv` adds optional `source_field,span_start,span_end,source_sha256,
surface,extractor,authority_sha256,candidate_id` columns. Legacy rows leave these
blank. New anchored rows must match their source and evidence exactly. Candidate
files are separate from the audit table until explicitly imported for review.

`entity_context.json` supplies one dossier per candidate plus document-level
research notes. It preserves document dates, nearby years and mentions, possible
quondam markers, proposed identities and their consulted sources. Co-occurrence
does not assert a relationship. External research is bound to the documentary
version using `source_documents` fingerprints; changes suppress old matches.

### Transcription quality fields

The generated QA report contains one row per documentary unit with `chars`,
`words`, optional `cer`/`wer`, a list of deterministic `flags`, a `priority`
and `review_required`. The report uses CER ≥ 0.15 and WER ≥ 0.40 as review
thresholds. Structural flags cover missing manual text, partial/regest status,
uncertain reading marks, unbalanced brackets, repeated whitespace and control
characters. It is an editorial triage aid: a clean row is not a claim that the
manuscript image and diplomatic reading agree in every detail.

## Enunciation extraction (`opinion_frames.json`)

Generated independently from manual `text_diplomatic` and `text_annex` by
`scripts/opinion_extraction.py`; regests and HTR are excluded. Each document
contains `frames`, `conditions`, and candidate `relations`. Frames preserve
`trigger`, `evidence`, and the wider punctuation-delimited `context`, each
with `source_field`, exact `quote`, SHA-256 and zero-based, end-exclusive
Unicode code-point offsets. The frame evidence is a candidate segment, not
an established deliberative act.

`kind` names the detected formula class; `force` may be `undetermined`.
`stance` remains `undetermined`. `voice.grammatical_person` is a local cue,
not an identity: `voice.identity` is null and `voice.status` is `unresolved`.
`negation` refers only to negation inside the trigger. Outcomes remain
`not_established`; generated frames have status `proposed`.

Conditions have status `unresolved_scope` or `linked_candidate`. Optional
relations `if_then` and `subject_to` identify the condition and target frame
by candidate ID, preserving the applied rule. `embedded_frames` identifies
recognized enunciations inside a delimited antecedent. The internal Boolean
`expression` remains null: conjunction words are not parsed as logical scope.

The report includes extractor version, configuration hash and coverage for
every documentary unit. It does not read `qualified_opinions.json`.
`evaluate_opinion_frames.py` compares trigger positions with the authored
model's evidence only as a development diagnostic, never as a gold benchmark.
