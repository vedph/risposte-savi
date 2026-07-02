# HTR evaluation — register 142 (Boschetti pipeline vs manual ground truth)

## Pipeline-level metrics (reported by F. Boschetti, Kraken/eScriptorium)
- **Segmentation error: 3%** (segmentation accuracy 97%).
- **Text-recognition CER: ~15%** (line-level, as reported by the pipeline; measurement basis — raw vs post-corrected output, reference set — to be confirmed with the pipeline author before publication).

HTR output: Kraken (eScriptorium), post-corrected (209 corrections / 128 forms, see `correzioni_HTR.md`). Coverage: 304 folio sides (1v–177r, with gaps 1r, 78v–92r, 93v–103r, 177v–end).

**Method.** Unit-level (not line-level PAGE-XML) evaluation. For each unit with a full manual diplomatic transcription and full HTR folio coverage, the HTR text of the unit's folio range is aligned to the ground truth (best-window local alignment, rapidfuzz `partial_ratio_alignment`) to trim material belonging to adjacent units sharing the same leaves; CER/WER are then computed with jiwer under a declared normalisation: Unicode diacritics stripped, lower-case, u/v and i/j folded, punctuation and editorial marks removed, whitespace collapsed. Because the ground truth is an expanded diplomatic transcription (abbreviations resolved editorially), these figures are an **upper bound** on pure glyph-recognition error.

**Sample.** 27 units evaluated (of 43 with full manual transcription). Exclusions are declared, not silent: units lacking full HTR folio coverage; units whose best local-alignment score falls below 75 (folio mapping or page quality to be verified on the originals); units whose ground-truth cell embeds editorial apparatus or spans a dossier beyond the declared folio range.


**Excluded (with reasons):**

- R142_0020 (cc. 61r-v): alignment_below_threshold(73)_folio_mapping_or_page_quality_to_verify
- R142_0025 (cc. 69r-v): gt_cell_contains_editorial_notes_and_ellipses;text_extends_to_70v_beyond_declared_range
- R142_0042 (cc. 150v-151r): gt_is_dossier_candidate_spanning_beyond_declared_range(~150v-156);to_split_or_recatalogue

**Aggregate (micro-average): CER = 0.098 · WER = 0.282** over 114,003 reference characters / 19,485 reference words.


| unit | folios | ref chars | CER | WER |
|---|---|---:|---:|---:|
| R142_0003 | cc. 3v-4v | 3,932 | 0.141 | 0.437 |
| R142_0004 | cc. 5 r-v | 755 | 0.197 | 0.405 |
| R142_0006 | cc. 15r-16r | 5,745 | 0.087 | 0.281 |
| R142_0007 | cc. 22 r-v | 1,832 | 0.146 | 0.389 |
| R142_0009 | cc. 30v-31r | 1,882 | 0.082 | 0.125 |
| R142_0010 | cc. 32r-33v | 6,728 | 0.043 | 0.124 |
| R142_0011 | cc. 35v-36r | 4,402 | 0.017 | 0.053 |
| R142_0012 | cc. 36v-39r | 10,627 | 0.041 | 0.084 |
| R142_0013 | cc. 39v-41r | 6,047 | 0.097 | 0.299 |
| R142_0016 | cc. 44r-v | 1,546 | 0.138 | 0.400 |
| R142_0017 | cc. 48v-49r | 3,457 | 0.137 | 0.400 |
| R142_0018 | cc. 52-53 | 5,726 | 0.092 | 0.265 |
| R142_0019 | cc. 59r-v | 1,784 | 0.156 | 0.390 |
| R142_0021 | cc. 62r-v | 2,339 | 0.103 | 0.286 |
| R142_0022 | cc. 66v-67r | 2,169 | 0.103 | 0.282 |
| R142_0034 | cc. 105 r-v | 3,602 | 0.103 | 0.301 |
| R142_0035 | cc. 106 r-v | 2,944 | 0.076 | 0.290 |
| R142_0036 | cc. 119v-120r | 1,467 | 0.140 | 0.449 |
| R142_0037 | cc. 131v-135r | 10,888 | 0.097 | 0.316 |
| R142_0038 | cc. 136-138 | 6,186 | 0.142 | 0.384 |
| R142_0039 | cc. 140v- | 4,921 | 0.101 | 0.314 |
| R142_0040 | cc. 142-146 | 13,100 | 0.106 | 0.320 |
| R142_0041 | cc. 147-148 | 4,031 | 0.158 | 0.395 |
| R142_0044 | cc. 161-162 | 3,096 | 0.120 | 0.304 |
| R142_0045 | c. 162 | 789 | 0.072 | 0.314 |
| R142_0046 | c. 163 | 1,211 | 0.137 | 0.418 |
| R142_0048 | cc. 167v-1683 | 2,797 | 0.113 | 0.323 |


## Reconciling the pipeline CER (~15%) and the corpus-level CER (9.8%)

The two figures measure different objects and are compatible, not conflicting. (1) **Level**: line-level pipeline evaluation vs unit-level evaluation with local alignment. (2) **Text state**: the corpus evaluation runs on the post-corrected file; however, the 209 applied corrections touch roughly 0.1% of the corpus characters, so post-correction alone cannot account for the difference and must not be presented as a five-point improvement. (3) **Normalisation**: the corpus evaluation folds u/v and i/j and strips diacritics and punctuation — orthographic variance that a standard CER counts as error; this is the main driver of the lower figure. (4) **Reference**: the project ground truth is Isabella Cecchini's diplomatic transcription, not the pipeline's internal reference set. Recommended reporting: cite all three figures (segmentation 3%; pipeline recognition CER ~15%; corpus-level unit CER 9.8% / WER 28.3% under the declared normalisation) with their definitions, and do not derive improvement claims from their difference.



## Reliability classes used in the dataset/site

- **A** manual diplomatic transcription (ground truth)
- **B** manual partial
- **C** regest + uncollated HTR full text (subject expert-identified; text recognised automatically; expected error profile = corpus CER above)
- **D** regest only
- **E** HTR only, uncollated
- **F** no text layer

Distribution: A_manual_ground_truth = 43, B_manual_partial = 1, C_regest_plus_htr_uncollated = 6, D_regest_only = 3.
