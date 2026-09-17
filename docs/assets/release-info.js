/* Counts are generated from the same canonical input as the downloadable CSVs. */
(function () {
  var m = (window.RISPOSTE || {}).meta;
  if (!m) return;
  document.querySelectorAll('[data-hypothesis-count]').forEach(function (el) { el.textContent = m.n_hypotheses; });
  document.querySelectorAll('[data-release-summary]').forEach(function (el) {
    var en = document.createElement('span'), it = document.createElement('span');
    en.className = 'xen'; it.className = 'xit';
    en.textContent = m.n_units + ' catalogued units. The corpus is a selection of the register; see PROVENANCE for counts and open questions.';
    it.textContent = m.n_units + ' unità censite. Il corpus è una selezione del registro; conteggi e questioni aperte in PROVENANCE.';
    el.replaceChildren(en, it);
  });
})();
