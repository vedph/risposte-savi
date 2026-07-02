/* Risposte - bilingual layer. Prose blocks use <span class="le">/<span class="li">;
   JS-generated labels use I18N[key][lang]. Default: browser language, persisted. */
(function () {
  "use strict";
  var LS = "r142-lang";
  function detect() {
    try { var v = localStorage.getItem(LS); if (v) return v; } catch (e) {}
   return "en";
  }
  var LANG = detect();
  document.documentElement.setAttribute("data-lang", LANG);
  document.documentElement.lang = LANG;
  window.I18N = {
    lang: function () { return LANG; },
    set: function (v) {
      LANG = v; document.documentElement.setAttribute("data-lang", v);
      document.documentElement.lang = v;
      try { localStorage.setItem(LS, v); } catch (e) {}
      document.dispatchEvent(new CustomEvent("langchange"));
    },
    t: function (k) { var e = DICT[k]; return e ? (e[LANG] || e.en) : k; }
  };
  var DICT = window.I18N_DICT = {
    home: { en: "Home", it: "Home" },
    register: { en: "Register", it: "Registro" },
    names: { en: "Names & places", it: "Nomi e luoghi" },
    model: { en: "Model", it: "Modello" },
    colophon: { en: "Colophon", it: "Colophon" },
    reading: { en: "Reading", it: "Lettura" },
    evidence: { en: "Evidence", it: "Evidenza" },
    search: { en: "Search title, text, signatories…", it: "Cerca titolo, testo, firmatari…" },
    domain: { en: "domain (hyp.)", it: "dominio (ipotesi)" },
    decision: { en: "decision (hyp.)", it: "decisione (ipotesi)" },
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
    analytical: { en: "Analytical - hypotheses", it: "Analitico - ipotesi" },
    college: { en: "College", it: "Collegio" },
    witnesses: { en: "Texts", it: "Testi" },
    text_primary: { en: "Diplomatic transcription", it: "Trascrizione diplomatica" },
    htr_panel: { en: "HTR output (automated text recognition - technical layer)", it: "Output HTR (riconoscimento automatico del testo - livello tecnico)" },
    htr_open: { en: "Show the HTR output", it: "Mostra l'output HTR" },
    gt: { en: "Diplomatic transcription - I. Cecchini (ground truth)", it: "Trascrizione diplomatica - I. Cecchini (ground truth)" },
    htr: { en: "HTR output - Kraken/eScriptorium (uncollated)", it: "Output HTR - Kraken/eScriptorium (non collazionato)" },
    regest: { en: "Regest", it: "Regesto" },
    regest_pending: { en: "Diplomatic transcription not yet available; the marginal note identifies the matter.", it: "Trascrizione diplomatica non ancora disponibile; la nota marginale identifica la materia." },
    no_htr: { en: "No HTR output for this unit: outside the current recognition batch.", it: "Nessun output HTR per questa unit\u00e0: fuori dal lotto di riconoscimento corrente." },
    htr_measured: { en: "measured on this unit vs ground truth:", it: "misurato su questa unità vs ground truth:" },
    htr_estimate: { en: "uncollated output of automated recognition; expected error = corpus estimate (CER 9.8% normalised). Not established text.", it: "output non collazionato del riconoscimento automatico; errore atteso = stima di corpus (CER 9,8% normalizzato). Non \u00e8 testo stabilito." },
    ed_note: { en: "editorial note - I. Cecchini", it: "nota editoriale - I. Cecchini" },
    archref: { en: "archival reference", it: "riferimento archivistico" },
    date: { en: "date", it: "data" },
    folio: { en: "folio", it: "carte" },
    marginal: { en: "marginal note", it: "nota marginale" },
    not_captured: { en: "not yet captured", it: "non ancora rilevata" },
    trigger: { en: "document trigger", it: "innesco documentario" },
    orientation: { en: "decision orientation", it: "orientamento della decisione" },
    geography: { en: "places (gazetteer)", it: "luoghi (gazetteer)" },
    actors: { en: "persons (extracted)", it: "persone (estratte)" },
    none_rec: { en: " -  none recorded", it: " -  non registrato" },
    hyp_note: { en: "Values proposed by rule-based extraction, each with rule id and the supporting passage; subject to expert review. Dashed marks = hypothesis.", it: "Valori proposti da estrazione a regole, ciascuno con id di regola e passo di riferimento; soggetti a revisione esperta. Segni tratteggiati = ipotesi." },
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
    persons: { en: "Persons", it: "Persone" },
    places: { en: "Places", it: "Luoghi" },
    p_validated: { en: "verified (subscription block)", it: "verificato (blocco di sottoscrizione)" },
    p_hyp: { en: "automatic identification, to review", it: "identificazione automatica, da rivedere" },
    p_norm_conf: { en: "normalised (confirmed)", it: "normalizzato (confermato)" },
    p_norm_prop: { en: "normalised (proposed)", it: "normalizzazione proposta" },
    p_uncertain: { en: "abbreviated diplomatic form; expansion to be verified", it: "forma diplomatica abbreviata; scioglimento da verificare" },
    p_diplomatic: { en: "diplomatic form", it: "forma diplomatica" },
    b_verified: { en: "verified", it: "verificato" },
    b_subscription: { en: "subscription block", it: "blocco di sottoscrizione" },
    b_automatic: { en: "automatic identification", it: "identificazione automatica" },
    b_toreview: { en: "to review", it: "da rivedere" },
    b_normconf: { en: "normalisation confirmed", it: "normalizzazione confermata" },
    b_normprop: { en: "normalization proposed", it: "normalizzazione proposta" },
    b_approx: { en: "approximate localisation", it: "localizzazione approssimata" },
    carry_note: { en: "In the current data export the marginal note and the text are continuous; the field boundary will be restored at revision.", it: "Nell'esportazione corrente dei dati la nota marginale e il testo sono continui; il confine di campo sar\u00e0 ripristinato in revisione." },
    tgn_pending: { en: "TGN: not aligned", it: "TGN: non allineato" },
    leg_title: { en: "Legend: statuses and labels", it: "Legenda: stati ed etichette" },
    leg_rel_t: { en: "Reading reliability (A\u2013F)", it: "Affidabilit\u00e0 di lettura (A\u2013F)" },
    leg_rel_d: { en: "Assigned per unit by the research team from the text layers available for that unit: A manual transcription \u00b7 B partial manual transcription \u00b7 C regest + HTR output \u00b7 D regest only \u00b7 E HTR output only \u00b7 F none. It concerns the text basis of the record, not the analytical fields.", it: "Assegnata per unit\u00e0 dal gruppo di ricerca in base ai livelli testuali disponibili per quella unit\u00e0: A trascrizione manuale \u00b7 B trascrizione manuale parziale \u00b7 C regesto + output HTR \u00b7 D solo regesto \u00b7 E solo output HTR \u00b7 F nessuno. Riguarda la base testuale della scheda, non i campi analitici." },
    leg_status_t: { en: "Transcription status", it: "Stato di trascrizione" },
    leg_status_d: { en: "manual = full diplomatic transcription by I. Cecchini \u00b7 manual_partial = partial manual transcription \u00b7 regest = summary only, not a transcription.", it: "manual = trascrizione diplomatica integrale di I. Cecchini \u00b7 manual_partial = trascrizione manuale parziale \u00b7 regest = solo regesto, non una trascrizione." },
    leg_cer_t: { en: "CER / WER", it: "CER / WER" },
    leg_cer_d: { en: "Character / word error rate of the HTR output, computed automatically against the manual transcription where both exist; where no manual transcription exists the error is estimated from the corpus figures.", it: "Tasso d'errore per carattere / parola dell'output HTR, calcolato automaticamente rispetto alla trascrizione manuale dove entrambe esistono; dove la trascrizione manuale manca, l'errore \u00e8 stimato dalle cifre di corpus." },
    leg_hyp_t: { en: "Dashed marks / \u201c?\u201d", it: "Segni tratteggiati / \u201c?\u201d" },
    leg_hyp_d: { en: "Analytical values (domain, decision orientation, actors) are rule-extracted hypotheses with cited evidence, subject to expert review; they are never presented as established facts. Full method: see the Model page and the colophon.", it: "I valori analitici (dominio, orientamento della decisione, attori) sono ipotesi estratte con regole, con evidenza citata, soggette a revisione esperta; non sono mai presentati come fatti accertati. Metodo completo: pagina Modello e colophon." },
    map_note: { en: "Places attested in the register are recorded in a controlled project list that preserves the attested form, the normalized form and, where available, the Getty TGN identifier. Coordinates are associated with normalized forms; uncertain cases and places not yet aligned with TGN are explicitly marked (\u2248 = approximate localisation, dashed on the map).", it: "I luoghi attestati nel registro sono registrati in una lista controllata di progetto, che conserva la forma attestata, la forma normalizzata e, quando disponibile, l'identificativo Getty TGN. Le coordinate sono associate alle forme normalizzate; i casi incerti o non ancora allineati al TGN sono indicati esplicitamente (\u2248 = localizzazione approssimata, tratteggiata sulla mappa)." },
    occurrences: { en: "occurrences", it: "occorrenze" },
    in_units: { en: "in", it: "in" },
    year: { en: "year", it: "anno" },
    hyp: { en: "hypothesis", it: "ipotesi" },
    validated: { en: "validated", it: "validato" },
    how_read: { en: "How to read a unit →", it: "Come si legge un'unità →" },
    key_extent: { en: "line length = folio extent", it: "lunghezza = estensione in carte" },
    key_solidline: { en: "solid line = expert transcription", it: "linea piena = trascrizione esperta" },
    key_dashline: { en: "dashed line = regest only", it: "linea tratteggiata = solo regesto" },
    key_teal: { en: "blue-grey underline = HTR output coverage", it: "sottolineatura grigio-blu = copertura dell'output HTR" },
    key_badge: { en: "A-F = reading reliability", it: "A-F = affidabilità della lettura" },
    key_term: { en: "end mark = decision (dashed = hypothesis)", it: "segno finale = decisione (tratteggiato = ipotesi)" },
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
    stats_cer: { en: "CER vs ground truth (normalised)", it: "CER vs ground truth (normalizzato)" }
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
