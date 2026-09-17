/* Public glyphs are projections of source-bound nuclei, never aggregate verdicts. */
(function () {
  'use strict';
  const documents = (window.QUALIFIED_OPINIONS || {documents: []}).documents;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const force = {recommendation:'Raccomandazione', assessment:'Valutazione', prediction:'Previsione', preference:'Preferenza', withheld_judgement:'Giudizio sospeso', request:'Richiesta', topic:'Questione attestata', report:'Informazione riferita'};
  const stance = {favourable:'Favorevole', opposed:'Contrario', mixed:'Articolato', neutral:'Neutro', undetermined:'Non determinato'};
  const text = (it, en) => window.I18N && I18N.lang() === 'en' ? en : it;
  const forceEn = {recommendation:'Recommendation', assessment:'Assessment', prediction:'Prediction', preference:'Preference', withheld_judgement:'Withheld judgement', request:'Request', topic:'Attested issue', report:'Reported information'};
  const stanceEn = {favourable:'Favourable', opposed:'Opposed', mixed:'Mixed', neutral:'Neutral', undetermined:'Undetermined'};
  const source = field => field === 'regest_note' ? text('Regesto editoriale', 'Editorial regest') : field === 'text_annex' ? text('Trascrizione dell’allegato', 'Annex transcription') : text('Trascrizione', 'Transcription');
  const label = n => text(force[n.force], forceEn[n.force]) + ' · ' + text(stance[n.stance], stanceEn[n.stance]) + (n.qualifications.condition ? text(' · condizionato', ' · conditional') : '');
  function sourceLink(uid, q) {
    const hash = 'source-' + q.source_field + '-' + q.span_start + '-' + q.span_end + '-' + q.source_sha256;
    return '<a class="reading-source-link" data-public-source href="unit.html?u=' + encodeURIComponent(uid) + '#' + esc(hash) + '">' + text('Leggi nel contesto', 'Read in context') + ' ↗</a>';
  }
  function get(uid) { return documents.find(d => d.unit_id === uid && d.source_status === 'current' && d.simple); }
  function terminal(doc, x, y) {
    const offsets = doc.nuclei.length === 1 ? [0] : doc.nuclei.length === 2 ? [-7, 7] : [-7, 0, 7];
    return '<g class="qualified-terminal" data-nuclei-count="' + doc.nuclei.length + '"><title>' + esc(doc.nuclei.length + ' ' + (doc.nuclei.length === 1 ? text('nucleo; apri la scheda', 'nucleus; open the record') : text('nuclei; apri la scheda per distinguerli', 'nuclei; open the record for details'))) + '</title>' +
      '<path d="M ' + x + ' ' + y + ' h 6' + (offsets.length > 1 ? ' M ' + (x + 6) + ' ' + (y - 7) + ' v 14' : '') + '" stroke="var(--accent)" fill="none" stroke-width="1.6" stroke-dasharray="3 2"/>' +
      offsets.map(dy => '<path d="M ' + (x + 6) + ' ' + (y + dy) + ' h 4.5" stroke="var(--accent)" stroke-width="1.4"/><circle cx="' + (x + 13) + '" cy="' + (y + dy) + '" r="2.5" fill="none" stroke="var(--accent)" stroke-width="1.4"/>').join('') +
      '<text x="' + (x + 23) + '" y="' + (y + 4) + '" font-size="12" class="mono" fill="var(--accent)">' + doc.nuclei.length + '</text></g>';
  }
  function nucleus(n) {
    const conditional = !!n.qualifications.condition;
    let end;
    if (n.stance === 'favourable') end = '<path d="M 65 15 L 76 23 L 65 31"/>';
    else if (n.stance === 'opposed') end = '<path d="M 73 13 V 33"/>';
    else if (n.stance === 'mixed') end = '<path d="M 65 13 V 33 M 68 15 L 78 23 L 68 31"/>';
    else if (n.stance === 'neutral') end = '<circle cx="73" cy="23" r="6"/>';
    else end = '<text x="69" y="29" stroke="none" fill="var(--soft)" font-size="20">?</text>';
    return '<svg class="nucleus-glyph" viewBox="0 0 90 46" width="90" height="46" role="img" aria-label="' + esc(label(n)) + '">' +
      '<title>' + esc(n.object) + '</title><g fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 2"><path d="M 6 23 H ' + (conditional ? '27 M 47 23 H ' : '') + '66"/>' + end + '</g>' +
      (conditional ? '<path d="M 37 12 L 48 23 L 37 34 L 26 23 Z" fill="var(--paper)" stroke="var(--accent)" stroke-width="1.5"/><text x="37" y="27" text-anchor="middle" fill="var(--accent)" font-size="11">C</text>' : '') + '</svg>';
  }
  function render(doc) {
    if (!doc) return '';
    doc = SiteLocale.opinion(doc);
    return '<section id="opinion-nuclei" class="public-opinions" data-public-opinion="' + esc(doc.unit_id) + '"><h3>' + text('Nuclei del parere', 'Opinion nuclei') + ' · ' + doc.nuclei.length + '</h3>' +
      '<p class="mut sm">' + text('Ogni glifo descrive un passaggio del parere. Aprilo per leggere chi parla, a quale questione si riferisce e quali condizioni pone.', 'Each glyph describes a component of the opinion. Open it to see who speaks, what issue is addressed and which conditions apply.') + ' <a href="method.html#reading">' + text('Come leggere una scheda', 'How to read a record') + '</a></p>' +
      '<p class="opinion-source-kind">' + (doc.source_field === 'regest_note' ? text('Solo regesto editoriale', 'Editorial regest only') : doc.transcription_status === 'manual_partial' ? text('Trascrizione parziale', 'Partial transcription') : text('Trascrizione integrale', 'Full transcription')) + '</p>' +
      (doc.coverage_note ? '<p class="opinion-coverage-note">' + esc(doc.coverage_note) + '</p>' : '') +
      '<details class="public-glyph-legend"><summary>' + text('Legenda dei glifi', 'Glyph legend') + '</summary><p class="public-glyph-key">' + text('Punta: favorevole · barra: contrario · punta e barra: articolato · cerchio: neutro · ?: non determinato. C nel rombo: condizionato. Tratteggio: lettura interpretativa. Il tipo di enunciato è scritto accanto al segno; non indica un esito accertato.', 'Arrowhead: favourable · bar: opposed · arrowhead and bar: mixed · circle: neutral · ?: undetermined. C in a diamond: conditional. Dashed: interpretative reading. The speech act is labelled beside the sign; it does not establish an outcome.') + '</p></details>' +
      '<div class="public-nuclei">' + doc.nuclei.map(n => {
        const simple = doc.simple.nuclei.find(s => s.id === n.id);
        return '<details id="' + esc(n.id) + '" class="public-nucleus" data-public-nucleus="' + esc(n.id) + '"><summary>' + nucleus(n) + '<span><b lang="' + I18N.lang() + '">' + esc(n.id.split('-').pop() + ' · ' + n.object) + '</b><small>' + esc(label(n)) + '</small></span></summary>' +
          '<p class="field-help">' + text('Voce: ', 'Voice: ') + '<span lang="' + I18N.lang() + '">' + esc(simple.voice) + '</span></p><p lang="' + I18N.lang() + '">' + esc(simple.summary) + '</p>' +
          n.evidence.map(q => '<div class="public-evidence"><p class="field-help">' + source(q.source_field) + '</p><blockquote lang="it">' + esc(q.quote) + '</blockquote>' + sourceLink(doc.unit_id, q) + '</div>').join('') +
          '<button type="button" class="btn" data-public-graph-focus="' + esc(n.id) + '">' + text('Apri condizioni e collegamenti', 'Open qualifications and links') + '</button></details>';
      }).join('') + '</div><details class="public-graph"><summary>' + text('Apri il grafo dei nuclei', 'Open the graph of nuclei') + '</summary><div class="public-graph-host">' + (window.OpinionGraph ? OpinionGraph.render(doc) : '') + '</div></details>' +
      '<p class="mut sm"><a href="data/qualified_opinions.json">' + text('Modello qualificato (dati)', 'Qualified model (data)') + '</a> · <a href="method.html">' + text('Metodo', 'Method') + '</a></p></section>';
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-public-graph-focus]');
    if (!button || !window.OpinionGraph) return;
    const section = button.closest('[data-public-opinion]'), doc = get(section.dataset.publicOpinion);
    if (!doc) return;
    const details = section.querySelector('.public-graph'); details.open = true;
    details.querySelector('.public-graph-host').innerHTML = OpinionGraph.render(doc, button.dataset.publicGraphFocus);
    details.scrollIntoView({block:'start'});
  });
  window.OpinionGlyphs = {get, terminal, nucleus, render, sourceLink};
})();
