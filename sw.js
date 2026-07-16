/* Risposte reg. 142 — offline cache. Network-first: deploys propagate on reload; cache is the offline fallback. */
const VERSION = "r142-v08c-2026-07-15";
const CORE = ["./","index.html","register.html","unit.html","names.html","model.html","about.html","corpus.html","decision.html","data.html","dataset-journal.html",
 "assets/style.css","assets/app.js","assets/i18n.js","data/units.js","data/abbreviations.js","data/gaps.js","data/hypo.js","data/names_authority.js","data/journal.js","assets/script/words.js",
 "assets/leaflet/leaflet.css","assets/leaflet/leaflet.js","assets/fonts/EBGaramond[wght].ttf","assets/fonts/EBGaramond-Italic[wght].ttf",
 "assets/fonts/IBMPlexMono-Regular.ttf","assets/fonts/IBMPlexMono-Medium.ttf","assets/fonts/IBMPlexMono-SemiBold.ttf"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;
 e.respondWith(fetch(e.request).then(res=>{
  const cp=res.clone();caches.open(VERSION).then(c=>c.put(e.request,cp));return res;
 }).catch(()=>caches.match(e.request)))});
