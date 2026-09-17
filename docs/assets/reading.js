/* Public reading: source links resolve only against the cited source revision. */
(function () {
  'use strict';
  const host = document.getElementById('unit-record');
  if (!host) return;
  const text = (it, en) => I18N.lang() === 'it' ? it : en;
  let revision = 0, origin = null;

  function clearPassage() {
    host.querySelectorAll('.source-highlight').forEach(mark => {
      const parent = mark.parentNode;
      mark.replaceWith(...mark.childNodes);
      parent.normalize();
    });
    host.querySelectorAll('.source-return').forEach(el => el.remove());
  }

  function findEvidence(doc, field, start, end) {
    if (!doc || typeof doc !== 'object') return null;
    if (doc.source_field === field && doc.span_start === start && doc.span_end === end && doc.quote) return doc;
    for (const value of Object.values(doc)) {
      if (value && typeof value === 'object') {
        const found = findEvidence(value, field, start, end);
        if (found) return found;
      }
    }
    return null;
  }

  async function followHash() {
    const request = ++revision;
    const hash = location.hash.slice(1);
    const record = host.querySelector('[data-reading-unit]');
    if (!record) return;
    const status = record.querySelector('.reader-status');
    status.textContent = '';
    clearPassage();
    const nucleus = Array.from(record.querySelectorAll('[data-public-nucleus]')).find(n => n.id === hash);
    if (nucleus) {
      nucleus.open = true;
      nucleus.querySelector('summary').focus({preventScroll:true});
      nucleus.scrollIntoView({block:'nearest'});
      return;
    }
    const match = /^source-(text_diplomatic|text_annex|regest_note)-(\d+)-(\d+)-([a-f0-9]{64})$/.exec(hash);
    if (!match) {
      if (hash.startsWith('source-')) status.textContent = text('Il rimando al passo non è completo. Aprilo dai nuclei del parere.', 'This passage reference is incomplete. Open it from the opinion nuclei.');
      return;
    }
    const unit = RISPOSTE.units.find(u => u.unit_id === record.dataset.readingUnit);
    const doc = window.OpinionGlyphs && OpinionGlyphs.get(unit.unit_id);
    const field = match[1], start = Number(match[2]), end = Number(match[3]);
    const q = findEvidence(doc, field, start, end);
    const block = record.querySelector('[data-reading-source="' + field + '"]');
    const source = unit[field] || '';
    const points = Array.from(source); // Dataset offsets count Unicode code points, not UTF-16 units.
    function unavailable() {
      status.textContent = text('Questo rimando non corrisponde al testo corrente della scheda.', 'This reference does not match the current text of the record.');
      status.scrollIntoView({block:'center'});
    }
    if (!q || q.source_sha256 !== match[4] || !block || block.textContent !== source || points.slice(start, end).join('') !== q.quote) {
      unavailable(); return;
    }
    // Verify the whole field: a matching excerpt alone cannot validate a changed source.
    try {
      const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
      if (request !== revision || !record.isConnected) return;
      const hashValue = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
      if (hashValue !== q.source_sha256) { unavailable(); return; }
    } catch (_) {
      if (request !== revision) return;
      status.textContent = text('Il passo citato resta disponibile nei nuclei; non è stato possibile verificarne il rimando nel testo.', 'The quotation remains available in the nuclei; its reference in the text could not be verified.');
      return;
    }
    if (field === 'text_diplomatic') window.__vt(record.querySelector('[data-v="d"]'));
    const annex = block.closest('details');
    if (annex) annex.open = true;
    const from = points.slice(0, start).join('').length, to = points.slice(0, end).join('').length;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node, offset = 0, started = false;
    while ((node = walker.nextNode())) {
      const boundary = offset + node.textContent.length;
      if (!started && from < boundary) { range.setStart(node, from - offset); started = true; }
      if (started && to <= boundary) { range.setEnd(node, to - offset); break; }
      offset = boundary;
    }
    const mark = document.createElement('mark');
    mark.className = 'source-highlight'; mark.id = hash; mark.tabIndex = -1;
    mark.appendChild(range.extractContents()); range.insertNode(mark);
    const back = document.createElement('a');
    back.className = 'source-return'; back.href = '#' + (origin && origin.nucleus || 'opinion-nuclei');
    back.textContent = text('↑ Torna al parere', '↑ Return to the opinion');
    back.addEventListener('click', e => {
      if (origin && origin.element.isConnected && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        origin.element.focus({preventScroll:true}); origin.element.scrollIntoView({block:'center'});
      }
    });
    block.after(back);
    status.textContent = text('Passo evidenziato nel testo di riferimento.', 'Passage highlighted in the reference text.');
    // Font loading and the browser's initial scroll restoration can move a long text.
    if (document.readyState !== 'complete') await new Promise(resolve => window.addEventListener('load', resolve, {once:true}));
    if (document.fonts) await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (request !== revision || !mark.isConnected) return;
    mark.focus({preventScroll:true}); mark.scrollIntoView({block:'center'});
    document.dispatchEvent(new CustomEvent('reader:passage', {detail:{field, start, end}}));
  }

  document.addEventListener('click', e => {
    const link = e.target.closest('[data-public-source]');
    if (!link || !host.contains(link) || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    const url = new URL(link.href);
    e.preventDefault();
    const nucleus = link.closest('[data-public-nucleus]');
    origin = {element:link, nucleus:nucleus && nucleus.id};
    if (location.hash === url.hash) followHash();
    else location.hash = url.hash;
  });
  window.addEventListener('hashchange', followHash);
  document.addEventListener('toggle', e => {
    if (host.contains(e.target) && e.target.matches('.public-graph[open]')) e.target.scrollIntoView({block:'start'});
  }, true);
  document.addEventListener('reader:render', () => { origin = null; followHash(); });
  followHash();
})();
