const CACHE="venise-admin-v2";
const FILES=["./","./index.html","./admin.css","./admin.js","./manifest.webmanifest"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("venise-admin-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",event=>{const request=event.request,url=new URL(request.url);if(request.method!=="GET"||url.pathname.endsWith("preview.html")||url.pathname.startsWith("/api/"))return;if(!url.pathname.startsWith(self.registration.scope.replace(location.origin,"")))return;event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}return response}).catch(()=>caches.match(request)))});
