/* Risposte - bilingual layer. Prose blocks use <span class="le">/<span class="li">;
   JS-generated labels use I18N[key][lang]. Default: browser language, persisted. */
(function () {
  "use strict";
  var LS = "r142-lang";
  function detect() {
    var requested = new URLSearchParams(window.location.search).get('lang');
    if (requested === 'en' || requested === 'it') {
      try { localStorage.setItem(LS, requested); } catch (e) {}
      return requested;
    }
    try { var v = localStorage.getItem(LS); if (v === 'en' || v === 'it') return v; } catch (e) {}
   return "en";
  }
  var LANG = detect();
  document.documentElement.setAttribute("data-lang", LANG);
  document.documentElement.lang = LANG;
  window.I18N = {
    lang: function () { return LANG; },
    set: function (v) {
      if (v !== 'en' && v !== 'it') return;
      LANG = v; document.documentElement.setAttribute("data-lang", v);
      document.documentElement.lang = v;
      try { localStorage.setItem(LS, v); } catch (e) {}
      var url = new URL(window.location.href);
      if (url.searchParams.has('lang')) {
        url.searchParams.set('lang', v);
        try { window.history.replaceState(null, '', url.href); } catch (e) {}
      }
      document.dispatchEvent(new CustomEvent("langchange"));
    },
    t: function (k) { var e = DICT[k]; return e ? (e[LANG] || e.en) : k; }
  };
  var DICT = window.I18N_DICT = {
    home: { en: "Home", it: "Home" },
    register: { en: "Register", it: "Registro" },
    names: { en: "Names & places", it: "Nomi e luoghi" },
    model: { en: "Model", it: "Modello" },
    colophon: { en: "About", it: "About" },
    reading: { en: "Reading", it: "Lettura" },
    evidence: { en: "Evidence", it: "Evidenza" },
    search: { en: "Search title, text, signatories…", it: "Cerca titolo, testo, firmatari…" },
    domain: { en: "domain (extracted)", it: "dominio (estratto)" },
    decision: { en: "decision (extracted)", it: "decisione (estratta)" },
    reliability: { en: "reliability", it: "affidabilità" },
    transcription: { en: "transcription", it: "trascrizione" },
    place: { en: "place", it: "luogo" },
    clear: { en: "clear", it: "azzera" },
    units: { en: "units", it: "unità" },
    register_order: { en: "register order", it: "ordine di registro" },
    select_unit: { en: "Select a unit.", it: "Seleziona un'unità." },
    unit_notfound: { en: "No unit with this identifier. Back to the", it: "Nessuna unità con questo identificativo. Torna al" },
    permalink: { en: "permalink", it: "permalink" },
    documentary: { en: "Documentary", it: "Documentario" },
    analytical: { en: "Analytical fields", it: "Campi analitici" },
    college: { en: "College", it: "Collegio" },
    witnesses: { en: "Texts", it: "Testi" },
    text_primary: { en: "Diplomatic transcription", it: "Trascrizione diplomatica" },
    htr_panel: { en: "HTR output (automated text recognition - technical layer)", it: "Output HTR (riconoscimento automatico del testo - livello tecnico)" },
    htr_open: { en: "Show the HTR output", it: "Mostra l'output HTR" },
    gt: { en: "Diplomatic transcription · Isabella Cecchini", it: "Trascrizione diplomatica · Isabella Cecchini" },
    htr: { en: "HTR output - Kraken/eScriptorium (uncollated)", it: "Output HTR - Kraken/eScriptorium (non collazionato)" },
    regest: { en: "Regest", it: "Regesto" },
    regest_pending: { en: "Diplomatic transcription not yet available; the marginal note identifies the matter.", it: "Trascrizione diplomatica non ancora disponibile; la nota marginale identifica la materia." },
    no_htr: { en: "No HTR output for this unit.", it: "Nessun output HTR per questa unit\u00e0." },
    htr_measured: { en: "comparison with the manual transcription:", it: "confronto con la trascrizione manuale:" },
    htr_estimate: { en: "Automatically recognized text. No error measurement is available for this unit.", it: "Testo riconosciuto automaticamente. Per questa unità non è disponibile una misura dell’errore." },
    ed_note: { en: "editorial integration or note", it: "integrazione o nota editoriale" },
    archref: { en: "archival reference", it: "riferimento archivistico" },
    date: { en: "date", it: "data" },
    folio: { en: "folio", it: "carte" },
    marginal: { en: "marginal note", it: "nota marginale" },
    not_captured: { en: "not recorded", it: "non registrata" },
    trigger: { en: "document trigger", it: "innesco documentario" },
    orientation: { en: "decision orientation", it: "orientamento della decisione" },
    geography: { en: "places (gazetteer)", it: "luoghi (gazetteer)" },
    actors: { en: "persons (extracted)", it: "persone (estratte)" },
    none_rec: { en: " -  none recorded", it: " -  non registrato" },
    hyp_note: { en: "Rule-based extraction with supporting passages and rule identifiers. Provenance and limits: Method.", it: "Estrazione a regole con passi di riferimento e identificativi di regola. Provenienza e limiti: pagina Metodo." },
    formula: { en: "performative formula", it: "formula performativa" },
    cue: { en: "cue", it: "spia" },
    terms: { en: "Extracted markers", it: "Marcatori estratti" },
    deontic: { en: "deontic", it: "deontici" },
    fiscal: { en: "fiscal", it: "fiscali" },
    monetary: { en: "monetary", it: "monetari" },
    institutions: { en: "institutions", it: "istituzioni" },
    validation: { en: "Validation", it: "Validazione" },
    flags: { en: "flags", it: "segnalazioni" },
    no_flags: { en: "no flags", it: "nessuna segnalazione" },
    relation: { en: "relation", it: "relazione" },
    exports: { en: "Export this unit:", it: "Esporta questa unità:" },
    signatories_nt: { en: "signatories not transcribed", it: "firmatari non trascritti" },
    absent: { en: "absent (named):", it: "assente (nominato):" },
    prev: { en: "‹ prev", it: "‹ prec" },
    next: { en: "next ›", it: "succ ›" },
    back_reg: { en: "‹ register", it: "‹ registro" },
    record_sections: { en: "In this record", it: "In questa scheda" },
    record_details: { en: "Document details", it: "Scheda documentaria" },
    opinion_nuclei: { en: "Opinion nuclei", it: "Nuclei del parere" },
    text_view: { en: "Text view", it: "Vista del testo" },
    regest_source: { en: "Reference text · editorial regest", it: "Testo di riferimento · regesto editoriale" },
    connected_opinions: { en: "Connected opinions", it: "Pareri connessi" },
    connected_opinions_note: { en: "Cross-references recorded in the unit metadata or in explicit editorial notes.", it: "Rinvii registrati nei metadati dell'unità o nelle note editoriali esplicite." },
    linked_from_note: { en: "mentioned in editorial notes", it: "menzionato nelle note editoriali" },
    register_start: { en: "Beginning of the available records", it: "Inizio delle schede disponibili" },
    register_end: { en: "End of the available records", it: "Fine delle schede disponibili" },
    continue_reading: { en: "Continue in register order", it: "Prosegui in ordine di registro" },
    persons: { en: "Persons", it: "Persone" },
    places: { en: "Places", it: "Luoghi" },
    p_validated: { en: "verified (subscription block)", it: "verificato (blocco di sottoscrizione)" },
    p_hyp: { en: "automatic identification (rule-based)", it: "identificazione automatica (a regole)" },
    p_norm_conf: { en: "normalised (confirmed)", it: "normalizzato (confermato)" },
    p_norm_prop: { en: "normalised (proposed)", it: "normalizzazione proposta" },
    p_uncertain: { en: "abbreviated diplomatic form; expansion to be verified", it: "forma diplomatica abbreviata; scioglimento da verificare" },
    p_diplomatic: { en: "diplomatic form", it: "forma diplomatica" },
    b_verified: { en: "verified", it: "verificato" },
    b_subscription: { en: "subscription block", it: "blocco di sottoscrizione" },
    b_automatic: { en: "automatic identification", it: "identificazione automatica" },
    b_toreview: { en: "to review", it: "da rivedere" },
    b_normconf: { en: "normalisation confirmed", it: "normalizzazione confermata" },
    b_normprop: { en: "normalisation proposed", it: "normalizzazione proposta" },
    b_approx: { en: "approximate localisation", it: "localizzazione approssimata" },
    carry_note: { en: "In the current data export the marginal note and the text are continuous; the field boundary will be restored at revision.", it: "Nell'esportazione corrente dei dati la nota marginale e il testo sono continui; il confine di campo sar\u00e0 ripristinato in revisione." },
    leg_title: { en: "Legend: statuses and labels", it: "Legenda: stati ed etichette" },
    leg_rel_t: { en: "Reading reliability (A\u2013F)", it: "Affidabilit\u00e0 di lettura (A\u2013F)" },
    leg_rel_d: { en: "Assigned per unit by the research team from the text layers available for that unit: A manual transcription \u00b7 B partial manual transcription \u00b7 C regest + HTR output \u00b7 D regest only \u00b7 E HTR output only \u00b7 F none. It concerns the text basis of the record, not the analytical fields.", it: "Assegnata per unit\u00e0 dal gruppo di ricerca in base ai livelli testuali disponibili per quella unit\u00e0: A trascrizione manuale \u00b7 B trascrizione manuale parziale \u00b7 C regesto + output HTR \u00b7 D solo regesto \u00b7 E solo output HTR \u00b7 F nessuno. Riguarda la base testuale della scheda, non i campi analitici." },
    leg_status_t: { en: "Transcription status", it: "Stato di trascrizione" },
    leg_status_d: { en: "manual_full = full manual transcription \u00b7 manual_partial = partial manual transcription \u00b7 regest = summary only, not a transcription.", it: "manual_full = trascrizione manuale integrale \u00b7 manual_partial = trascrizione manuale parziale \u00b7 regest = solo regesto, non una trascrizione." },
    leg_cer_t: { en: "CER / WER", it: "CER / WER" },
    leg_cer_d: { en: "Character / word error rate of the HTR output, computed automatically against the manual transcription where both exist; otherwise no measure is given.", it: "Tasso d\u0027errore per carattere / parola dell\u0027output HTR, calcolato automaticamente rispetto alla trascrizione manuale dove entrambe esistono; altrimenti non \u00e8 data alcuna misura." },
    leg_hyp_t: { en: "Dashed marks / \u201c?\u201d", it: "Segni tratteggiati / \u201c?\u201d" },
    leg_hyp_d: { en: "Analytical values (domain, decision orientation, actors) are extracted from the text by rules, each with its rule and supporting passage; they are derived data, kept apart from the documentary record. Dashed marks and \u201c?\u201d identify them. Method: see the Model and Method pages.", it: "I valori analitici (dominio, orientamento della decisione, attori) sono estratti dal testo con regole, ciascuno con la regola e il passo di riferimento; sono dati derivati, tenuti distinti dal record documentario. Il tratteggio e \u201c?\u201d li identificano. Metodo: pagine Modello e Metodo." },
    map_note: { en: "Places attested in the register are recorded in a controlled project list that preserves the attested form and the normalised form. Coordinates are associated with normalised forms; uncertain cases are marked (\u2248 = approximate localisation, dashed on the map).", it: "I luoghi attestati nel registro sono registrati in una lista controllata di progetto, che conserva la forma attestata e la forma normalizzata. Le coordinate sono associate alle forme normalizzate; i casi incerti sono indicati (\u2248 = localizzazione approssimata, tratteggiata sulla mappa)." },
    occurrences: { en: "occurrences", it: "occorrenze" },
    in_units: { en: "in", it: "in" },
    year: { en: "year", it: "anno" },
    hyp: { en: "extracted", it: "estratto" },
    validated: { en: "validated", it: "validato" },
    how_read: { en: "How to read a unit →", it: "Come si legge un'unità →" },
    key_extent: { en: "line length = folio extent", it: "lunghezza = estensione in carte" },
    key_solidline: { en: "solid line = manual transcription", it: "linea piena = trascrizione manuale" },
    key_dashline: { en: "dashed line = regest only", it: "linea tratteggiata = solo regesto" },
    key_teal: { en: "blue-grey underline = HTR output coverage", it: "sottolineatura grigio-blu = copertura dell'output HTR" },
    key_badge: { en: "A-F = reading reliability", it: "A-F = affidabilità della lettura" },
    key_term: { en: "end mark = decision (dashed = rule-extracted)", it: "segno finale = decisione (tratteggiato = estratto con regole)" },
    key_nuclei: { en: "branched end + number = nuclei of the opinion; open the record", it: "terminale ramificato + numero = nuclei del parere; apri la scheda" },
    grant: { en: "grant", it: "concede" },
    deny: { en: "deny / prohibit", it: "nega / vieta" },
    regulate: { en: "regulate", it: "regola" },
    recommend: { en: "recommend / propose", it: "raccomanda / propone" },
    confirm_k: { en: "confirm / inform / other", it: "conferma / informa / altro" },
    none_k: { en: "none recorded", it: "non registrato" },
    replay: { en: "Replay", it: "Rivedi" },
    stats_units: { en: "decision units", it: "unità di decisione" },
    stats_gt: { en: "manual diplomatic transcriptions", it: "trascrizioni diplomatiche manuali" },
    stats_htr: { en: "digitised pages with HTR output", it: "pagine digitalizzate con output HTR" },
    stats_cer: { en: "CER against the manual transcription", it: "CER rispetto alla trascrizione manuale" }
  };
  document.addEventListener("DOMContentLoaded", function () {
    var b = document.getElementById("langbtn");
    if (b) {
      function paint() { b.textContent = LANG === "it" ? "EN" : "IT"; b.setAttribute("aria-label", LANG === "it" ? "Switch to English" : "Passa all'italiano"); }
      paint();
      b.addEventListener("click", function () { window.I18N.set(LANG === "it" ? "en" : "it"); paint(); });
    }
  });
})();

/* ---- revision 2026-07-15: expanded view, bilingual regesti, provenance ---- */
(function () {
  if (!window.I18N_DICT) return;
  var add = {
    view_diplo:  { en: "Diplomatic", it: "Diplomatica" },
    view_expanded: { en: "Interpretative", it: "Interpretativa" },
    view_side:  { en: "Side by side", it: "Affiancate" },
    regest_prop: { en: "editorial summary", it: "sintesi editoriale" },
    practice_strict: { en: "Abbreviations expanded in square brackets; u/v spellings retained.", it: "Scioglimenti delle abbreviazioni tra parentesi quadre; grafie u/v conservate." },
    practice_loose:  { en: "In this transcription, expansions are not systematically marked.", it: "In questa trascrizione gli scioglimenti non sono segnalati sistematicamente." },
    src_contig: { en: "source: manual transcription, folios 29v-39v", it: "fonte: trascrizione manuale, carte 29v-39v" },
    src_wd:     { en: "source: manual transcription", it: "fonte: trascrizione manuale" },
    src_fac:    { en: "source: read from the digitisations (2026)", it: "fonte: lettura dalle digitalizzazioni (2026)" },
    gt_fac:     { en: "Diplomatic transcription · from the digitisations (2026)", it: "Trascrizione diplomatica · dalle digitalizzazioni (2026)" },
    legacy_id:  { en: "identifier in the July 2026 releases", it: "identificativo nelle release di luglio 2026" },
    dbl_att:    { en: "double attestation (texts coincide)", it: "doppia attestazione (testi coincidenti)" },
    emend_note: { en: "Proposed emendation; transcription reading:", it: "Emendamento proposto; lezione della trascrizione:" },
    unc_reading:{ en: "uncertain reading", it: "lettura incerta" },
    illegible:  { en: "illegible portion", it: "porzione illeggibile" },
    ednotes_lab:{ en: "Editorial notes", it: "Note editoriali" },
    annex:      { en: "Annexed text", it: "Testo allegato" }
  };
  for (var k in add) window.I18N_DICT[k] = add[k];
})();
