/* Local cartography for the project gazetteer. Names and source coordinates are unchanged. */
(function () {
  'use strict';
  function escape(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  window.RisposteMap = {
    create: function (id, places, options) {
      var L = window.L, atlas = window.RISPOSTE_ATLAS;
      if (!L || !atlas) throw new Error('Local cartography is unavailable');
      var italian = options.lang === 'it';
      var words = italian ? {
        adriatic: 'Adriatico', all: 'Tutti i luoghi', region: 'Luoghi nel registro',
        mapped: 'luoghi sulla mappa', size: 'Dimensione: occorrenze', approx: 'Localizzazione approssimata',
        occurrence: 'occorrenza', occurrences: 'occorrenze', sources: 'Apri le risposte',
        coast: 'Geografia', zoomIn: 'Ingrandisci', zoomOut: 'Riduci'
      } : {
        adriatic: 'Adriatic', all: 'All places', region: 'Places in the register',
        mapped: 'mapped places', size: 'Size: occurrences', approx: 'Approximate location',
        occurrence: 'occurrence', occurrences: 'occurrences', sources: 'Read the opinions',
        coast: 'Geography', zoomIn: 'Zoom in', zoomOut: 'Zoom out'
      };
      var points = places.filter(function (p) { return Number.isFinite(p.lat) && Number.isFinite(p.lon); });
      var map = L.map(id, {scrollWheelZoom: false, minZoom: 3, maxZoom: 9,
        zoomSnap: 0.25, maxBounds: [[16, -24], [59, 47]], maxBoundsViscosity: 0.9,
        zoomControl: false, attributionControl: true});
      var host = map.getContainer(), frame = host.parentNode;
      host.setAttribute('aria-label', words.region);
      host.setAttribute('role', 'region');
      map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
      L.control.zoom({position: 'topright', zoomInTitle: words.zoomIn, zoomOutTitle: words.zoomOut}).addTo(map);
      L.geoJSON(atlas.land, {style: {color: '#CFCCC2', weight: 0.85, fillColor: '#FFFFFF', fillOpacity: 1},
        interactive: false, smoothFactor: 0.35,
        attribution: words.coast + ': <a href="https://www.naturalearthdata.com/">Natural Earth</a>'}).addTo(map);
      L.geoJSON(atlas.lakes, {style: {color: '#CFCCC2', weight: 0.4, fillColor: '#F1F1EF', fillOpacity: 1},
        interactive: false, smoothFactor: 0.35}).addTo(map);
      var toolbar = frame.querySelector('.atlas-toolbar');
      toolbar.innerHTML = '<span class="atlas-count">' + points.length + ' ' + words.mapped + '</span>';
      frame.querySelector('.atlas-legend').innerHTML = '<span><i class="atlas-dot" aria-hidden="true"></i>' + words.size + '</span>' +
        '<span><i class="atlas-dot approximate" aria-hidden="true"></i>' + words.approx + '</span>';
      map.fitBounds(L.latLngBounds(points.map(function (p) { return [p.lat, p.lon]; })), {paddingTopLeft: [36, 32], paddingBottomRight: [44, 38], animate: false});

      var labelPane = map.createPane('atlasLabels');
      labelPane.style.zIndex = '450'; labelPane.style.pointerEvents = 'none';
      var seaPane = map.createPane('atlasSeas');
      seaPane.style.zIndex = '350'; seaPane.style.pointerEvents = 'none';
      var seas = [
        [42.1, 15.7, 'Adriatic Sea', 'Mare Adriatico', -49],
        [39.7, 11.0, 'Tyrrhenian Sea', 'Mar Tirreno', 0],
        [37.3, 18.6, 'Ionian Sea', 'Mar Ionio', 0],
        [38.0, 25.3, 'Aegean Sea', 'Mar Egeo', -18],
        [33.8, 15.7, 'Mediterranean Sea', 'Mar Mediterraneo', 0],
        [43.3, 33.1, 'Black Sea', 'Mar Nero', 0]
      ];
      seas.forEach(function (s) {
        L.marker([s[0], s[1]], {interactive: false, keyboard: false, pane: 'atlasSeas', icon: L.divIcon({
          className: 'atlas-sea', iconSize: [180, 24], iconAnchor: [90, 12],
          html: '<span style="transform:rotate(' + s[4] + 'deg)">' + (italian ? s[3] : s[2]) + '</span>'
        })}).addTo(map);
      });
      var entries = [], priority = ['Venezia', 'Spalato', 'Narenta', 'Ragusi', 'Roma', 'Napoli', 'Candia', 'Costantinopoli', 'Alessandria', 'Lisbona', 'Cipro'];
      points.forEach(function (p) {
        var radius = 4 + Math.min(5, Math.sqrt(p.units.length) * 1.4);
        var marker = L.circleMarker([p.lat, p.lon], {radius: radius, color: '#B01E28', weight: p.approx ? 1.5 : 2,
          dashArray: p.approx ? '3 3' : null, fillColor: '#B01E28', fillOpacity: p.approx ? 0.07 : 0.18}).addTo(map);
        var count = p.units.length + ' ' + (p.units.length === 1 ? words.occurrence : words.occurrences);
        marker.bindPopup('<div class="atlas-popup"><h4 translate="no">' + escape(p.name) + '</h4><p>' + count +
          (p.approx ? ' · ' + words.approx : '') + '</p><p class="atlas-popup-label">' + words.sources + '</p>' +
          '<div class="atlas-source-links">' + options.links(p.units) + '</div></div>', {maxWidth: 260, minWidth: 150, autoPanPadding: [18, 18]});
        marker.bindTooltip(escape(p.name), {direction: 'top', className: 'atlas-hover'});
        var element = marker.getElement();
        if (element) {
          element.setAttribute('tabindex', '0'); element.setAttribute('role', 'button');
          element.setAttribute('aria-label', p.name + ': ' + count + (p.approx ? ', ' + words.approx : ''));
          element.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); marker.openPopup(); }
          });
        }
        var index = priority.indexOf(p.name);
        entries.push({place: p, marker: marker, radius: radius, priority: index < 0 ? 100 - p.units.length : index});
      });
      entries.sort(function (a, b) { return a.priority - b.priority || a.place.name.localeCompare(b.place.name); });
      var labels = L.layerGroup().addTo(map);
      function drawLabels() {
        labels.clearLayers();
        var size = map.getSize(), occupied = [[size.x - 65, 0, size.x, 112], [0, size.y - 24, size.x, size.y]];
        if (size.x < 1) return;
        var markerBoxes = entries.map(function (entry) {
          var pt = map.latLngToContainerPoint([entry.place.lat, entry.place.lon]);
          return [pt.x - entry.radius - 2, pt.y - entry.radius - 2, pt.x + entry.radius + 2, pt.y + entry.radius + 2];
        });
        function overlaps(a, b) { return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]; }
        entries.forEach(function (entry) {
          var p = entry.place, point = map.latLngToContainerPoint([p.lat, p.lon]);
          if (point.x < 0 || point.x > size.x || point.y < 0 || point.y > size.y) return;
          var width = Math.max(36, p.name.length * 7.8 + 8), height = 24, distance = entry.radius + 6;
          var positions = [[distance, -height / 2], [-distance - width, -height / 2], [-width / 2, -distance - height], [-width / 2, distance],
            [distance + 12, -height * 2], [-distance - width - 12, -height * 2],
            [distance + 12, height], [-distance - width - 12, height]];
          for (var i = 0; i < positions.length; i++) {
            var dx = positions[i][0], dy = positions[i][1], rect = [point.x + dx, point.y + dy, point.x + dx + width, point.y + dy + height];
            if (rect[0] < 6 || rect[1] < 6 || rect[2] > size.x - 6 || rect[3] > size.y - 26) continue;
            if (occupied.some(function (b) { return overlaps(rect, b); }) || markerBoxes.some(function (b) { return overlaps(rect, b); })) continue;
            occupied.push(rect);
            if (i >= 4) {
              var end = map.containerPointToLatLng([point.x + dx + (dx < 0 ? width : 0), point.y + dy + height / 2]);
              L.polyline([[p.lat, p.lon], end], {pane: 'atlasLabels', color: '#CFCCC2', weight: 1, interactive: false}).addTo(labels);
            }
            L.marker([p.lat, p.lon], {interactive: false, keyboard: false, pane: 'atlasLabels', icon: L.divIcon({
              className: 'atlas-place', iconSize: [width, height], iconAnchor: [-dx, -dy],
              html: '<span translate="no">' + escape(p.name) + '</span>'
            })}).addTo(labels);
            break;
          }
        });
      }
      map.on('moveend zoomend resize', drawLabels);
      drawLabels();
      return map;
    }
  };
})();
