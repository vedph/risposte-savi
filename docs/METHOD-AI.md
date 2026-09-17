# Use of AI tools

AI tools were used in drafting, prototyping and documenting the website and its
extraction heuristics, and, in the September 2026 revision, as an aid in two
tasks that are declared here once and recorded in the data:

- rereading the diplomatic transcriptions against the digitisations of register
  142. Every reading changed in that revision is recorded in the unit
  (`transcription_corrections`: previous reading, current reading, folio,
  digitisation, `agent: LLM-assisted`, date) and shown in the record under
  "Revision on the digitisations". Three responses absent from the July releases
  and the beginning of one more were transcribed from the digitisations in the
  same way and carry `text_source: facsimile_2026`. Readings that could not be
  settled keep the mark (?).
- formulating the qualified model of the opinions (nuclei, voices, conditions,
  grounds, links), each element supported by quoted passages of the text.

The English version of the editorial texts (titles, regests, interpretations, interface) is a working translation made with Claude (Anthropic). All of this was checked by the curators, who are responsible for the published texts and
interpretations. The manual transcription by Isabella Cecchini remains the
baseline; her validation of the revised readings is recorded as pending in the
data (`validation_status`). Rule-based extraction (names, places, cues,
statements) is a separate, reproducible process that does not call a language
model. The use of AI tools does not replace domain expertise or the revision of
the published data.
