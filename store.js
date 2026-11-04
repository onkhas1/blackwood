// Хранилище. Сразу пишет в браузер; в Telegram дополнительно копирует всё в облако аккаунта,
// поэтому прогресс и кошелёк едут с игроком на другое устройство.
(() => {
  const tg = window.Telegram && window.Telegram.WebApp;
  const uid = tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.id;
  const cloud = uid && tg.isVersionAtLeast('6.9') ? tg.CloudStorage : null;
  const prefix = uid ? `u${uid}:` : '';
  const KEYS = ['blackwood-save-v1', 'nochnik-wallet-v1', 'blackwood-finished'];
  const CLOUD_KEY = 'state';
  const CLOUD_LIMIT = 4096;
  const TIME_KEY = 'store-time';

  const raw = (k) => { try { return localStorage.getItem(prefix + k); } catch { return null; } };
  const put = (k, v) => { try { v === null ? localStorage.removeItem(prefix + k) : localStorage.setItem(prefix + k, v); } catch {} };

  let timer = null;
  function push() {
    clearTimeout(timer);
    timer = null;
    if (!cloud) return;
    const d = {};
    for (const k of KEYS) { const v = raw(k); if (v !== null) d[k] = v; }
    const payload = JSON.stringify({ t: Number(raw(TIME_KEY)) || 0, d });
    if (payload.length > CLOUD_LIMIT) return;
    cloud.setItem(CLOUD_KEY, payload, () => {});
  }
  function changed() {
    put(TIME_KEY, String(Date.now()));
    if (cloud && !timer) timer = setTimeout(push, 1500); // реплики идут часто, облако так не любит
  }

  // Новее то, что записано позже: облако или этот телефон
  const ready = new Promise((resolve) => {
    if (!cloud) return resolve();
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    setTimeout(finish, 2000);
    cloud.getItem(CLOUD_KEY, (err, value) => {
      if (done) return;
      let remote = null;
      try { if (!err && value) remote = JSON.parse(value); } catch {}
      const localTime = Number(raw(TIME_KEY)) || 0;
      if (remote && remote.t > localTime) {
        for (const k of KEYS) put(k, Object.hasOwn(remote.d, k) ? remote.d[k] : null);
        put(TIME_KEY, String(remote.t));
      } else if (localTime && (!remote || localTime > remote.t)) {
        push();
      }
      finish();
    });
  });

  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && timer) push(); });
  window.STORE = {
    ready,
    get: raw,
    set: (k, v) => { put(k, v); changed(); },
    remove: (k) => { put(k, null); changed(); },
    tg: uid ? tg : null,
  };
})();
