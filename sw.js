const CACHE="invoice-firebase-v1";
const CORE=["./","./index.html","./styles.css","./app.js","./firebase-config.js","./manifest.webmanifest"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE))));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{if(e.request.method==="GET"&&new URL(e.request.url).origin===location.origin)e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
