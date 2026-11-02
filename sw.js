const C='blackwood-v11';const F=["./", "assets/bg/archive.webp", "assets/bg/board.webp", "assets/bg/bridge.webp", "assets/bg/car.webp", "assets/bg/corridor.webp", "assets/bg/dinner.webp", "assets/bg/house.webp", "assets/bg/kitchen.webp", "assets/bg/parking.webp", "assets/bg/porch.webp", "assets/bg/room.webp", "assets/bg/roomNight.webp", "assets/bg/station.webp", "assets/fonts/alegreya-cyrillic-400-normal.woff2", "assets/fonts/caveat-cyrillic-500-normal.woff2", "assets/fonts/cormorant-cyrillic-500-normal.woff2", "assets/fonts/literata-cyrillic-400-italic.woff2", "assets/fonts/literata-cyrillic-400-normal.woff2", "assets/fonts/literata-latin-400-normal.woff2", "assets/grain-dark.png", "assets/grain.png", "assets/icon-512.png", "assets/sprites/dustin_cold.webp", "assets/sprites/dustin_flirt.webp", "assets/sprites/dustin_smirk.webp", "assets/sprites/ethan_awkward.webp", "assets/sprites/ethan_hurt.webp", "assets/sprites/ethan_smile.webp", "assets/sprites/heroine_smile.webp", "assets/sprites/heroine_smirk.webp", "assets/sprites/heroine_upset.webp", "assets/sprites/jane_laugh.webp", "assets/sprites/jane_scared.webp", "assets/sprites/jane_sly.webp", "assets/sprites/karen_sad.webp", "assets/sprites/karen_stern.webp", "assets/sprites/karen_warm.webp", "assets/sprites/logan_alert.webp", "assets/sprites/logan_angry.webp", "assets/sprites/logan_grin.webp", "assets/sprites/norman_calm.webp", "assets/sprites/norman_cold.webp", "assets/sprites/norman_smile.webp", "assets/sprites/richard_cold.webp", "assets/sprites/richard_smile.webp", "assets/sprites/richard_tense.webp", "game.js", "index.html", "manifest.webmanifest", "story.js", "style.css"];
const isCode=(u)=>/\/$|\.(html|js|css|webmanifest)$/.test(new URL(u).pathname);
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(f=>new Request(f,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
// Код берём из сети, чтобы правки приезжали сразу; без сети или при плохой сети из кэша
function fresh(req){
  const net=fetch(req,{cache:'no-cache'}).then(r=>{if(r.ok){const k=r.clone();caches.open(C).then(c=>c.put(req,k));}return r;});
  const slow=new Promise((res,rej)=>setTimeout(()=>caches.match(req).then(r=>r?res(r):rej()),2500));
  return Promise.race([net,slow]).catch(()=>caches.match(req).then(r=>r||caches.match('index.html')));
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  if(isCode(e.request.url))e.respondWith(fresh(e.request));
  else e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
