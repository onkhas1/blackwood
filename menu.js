// Главное меню: список историй, энергия, монеты, промокод. Экономика пока заглушка, числа правятся здесь.
(() => {
  const APP_NAME = 'After Dark';
  const CHAPTER_COST = 15;
  const ENERGY_CAP = 30;     // выше сама не растёт, промокод может дать больше
  const START_ENERGY = 30;
  const REGEN_MS = 10 * 60 * 1000;
  const PROMOS = { onkhas1: { coins: 10000, energy: 1000 } };
  const WALLET_KEY = 'nochnik-wallet-v1';
  const DONE_KEY = 'blackwood-finished';
  const STORIES = [{
    id: 'blackwood',
    title: 'Тринадцатая',
    cover: 'assets/bg/house.webp',
    desc: 'После смерти мамы ты приезжаешь в городок, откуда она когда-то уехала и о котором никогда не рассказывала. Чем дольше ты здесь остаёшься, тем сильнее тебя во всё это втягивает.',
    first: { num: 1, title: 'Приезд' },
  }];

  const $ = (id) => document.getElementById(id);
  const num = (n) => n.toLocaleString('ru-RU');
  const BOLT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/></svg>';

  let wallet = readWallet();
  let openStory = null;
  let sureTimer = null;

  function readWallet() {
    try {
      const w = JSON.parse(localStorage.getItem(WALLET_KEY));
      if (w && Number.isFinite(w.energy)) return w;
    } catch {}
    return { energy: START_ENERGY, coins: 0, at: Date.now(), promos: [] };
  }
  function saveWallet() {
    try { localStorage.setItem(WALLET_KEY, JSON.stringify(wallet)); } catch {}
  }
  // Энергия считается по времени, поэтому копится и пока игра закрыта
  function regen() {
    const now = Date.now();
    if (wallet.energy >= ENERGY_CAP) { wallet.at = now; return; }
    const gained = Math.floor((now - wallet.at) / REGEN_MS);
    if (gained <= 0) return;
    wallet.energy = Math.min(ENERGY_CAP, wallet.energy + gained);
    wallet.at = wallet.energy >= ENERGY_CAP ? now : wallet.at + gained * REGEN_MS;
    saveWallet();
  }
  function clock(ms) {
    const total = Math.ceil(ms / 1000);
    const h = Math.floor(total / 3600), m = Math.floor(total % 3600 / 60), s = total % 60;
    const pad = (x) => String(x).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  }
  const msToNext = () => Math.max(0, REGEN_MS - (Date.now() - wallet.at));
  const msToChapter = () => msToNext() + (CHAPTER_COST - wallet.energy - 1) * REGEN_MS;
  const canPay = () => { regen(); return wallet.energy >= CHAPTER_COST; };
  function pay() {
    if (!canPay()) return false;
    wallet.energy -= CHAPTER_COST;
    saveWallet();
    return true;
  }
  const isDone = () => { try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return false; } };
  function setDone(v) {
    try { v ? localStorage.setItem(DONE_KEY, '1') : localStorage.removeItem(DONE_KEY); } catch {}
  }

  function storyStatus() {
    const s = window.GAME.saved();
    if (s) {
      const c = s.state.chapter || STORIES[0].first;
      return { kind: s.state.locked ? 'locked' : 'playing', label: `Глава ${c.num}. ${c.title}` };
    }
    if (isDone()) return { kind: 'done', label: 'Новые главы пишутся' };
    return { kind: 'new', label: 'Новая история' };
  }

  function renderWallet() {
    regen();
    $('energyNum').textContent = num(wallet.energy);
    $('coinNum').textContent = num(wallet.coins);
    $('regen').textContent = wallet.energy < ENERGY_CAP ? `+1 энергия через ${clock(msToNext())}` : '';
  }

  function renderList() {
    const list = $('list');
    list.textContent = '';
    for (const story of STORIES) {
      const st = storyStatus();
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'story';
      const cover = document.createElement('div');
      cover.className = 'cover';
      cover.style.backgroundImage = `url(${story.cover})`;
      const text = document.createElement('div');
      text.className = 'story-text';
      const h = document.createElement('h2');
      h.textContent = story.title;
      const where = document.createElement('p');
      where.className = 'where';
      where.textContent = st.label;
      text.append(h, where);
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      arrow.setAttribute('viewBox', '0 0 24 24');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = '<path d="M9 5l7 7-7 7"/>';
      b.append(cover, text, arrow);
      b.addEventListener('click', () => showDetail(story));
      list.append(b);
    }
  }

  function renderDetail() {
    const story = openStory;
    if (!story) return;
    const st = storyStatus();
    $('detailCover').style.backgroundImage = `url(${story.cover})`;
    $('detailTitle').textContent = story.title;
    $('detailWhere').textContent = st.label;
    $('detailDesc').textContent = story.desc;
    const act = $('mainAct'), note = $('actNote'), again = $('restart');
    const cost = ` <span class="cost">${BOLT}${CHAPTER_COST}</span>`;
    const short = !canPay();
    const wait = short ? `Энергии хватит через ${clock(msToChapter())}` : '';
    note.hidden = true;
    act.hidden = false;
    act.disabled = false;
    again.hidden = st.kind === 'new';
    if (!again.classList.contains('sure')) again.textContent = 'Начать сначала';
    if (st.kind === 'new') {
      act.innerHTML = `Начать${cost}`;
      act.disabled = short;
      if (short) { note.textContent = wait; note.hidden = false; }
    } else if (st.kind === 'playing') {
      act.textContent = 'Продолжить';
      note.textContent = st.label;
      note.hidden = false;
    } else if (st.kind === 'locked') {
      act.innerHTML = `Открыть главу${cost}`;
      act.disabled = short;
      if (short) { note.textContent = wait; note.hidden = false; }
    } else {
      act.hidden = true;
      note.textContent = 'Это пока всё. Когда выйдет новая глава, она появится здесь.';
      note.hidden = false;
    }
  }

  function showDetail(story) {
    openStory = story;
    $('stories').hidden = true;
    $('detail').hidden = false;
    $('menu').scrollTop = 0;
    resetSure();
    renderDetail();
  }
  function showList() {
    openStory = null;
    $('detail').hidden = true;
    $('stories').hidden = false;
    renderList();
  }

  function open() {
    window.GAME.toMenu();
    $('menu').hidden = false;
    renderWallet();
    if (openStory) renderDetail(); else renderList();
  }

  function resetSure() {
    clearTimeout(sureTimer);
    $('restart').classList.remove('sure');
  }

  $('mainAct').addEventListener('click', () => {
    const st = storyStatus();
    if (st.kind === 'playing' || st.kind === 'locked') { window.GAME.resume(); return; }
    if (pay()) { setDone(false); window.GAME.begin(); }
  });
  // Начать сначала стирает прогресс, поэтому первое нажатие только переспрашивает
  $('restart').addEventListener('click', () => {
    const b = $('restart');
    if (!b.classList.contains('sure')) {
      b.classList.add('sure');
      b.textContent = `Прогресс сотрётся, глава стоит ${CHAPTER_COST} энергии. Нажми ещё раз`;
      sureTimer = setTimeout(() => { resetSure(); renderDetail(); }, 5000);
      return;
    }
    resetSure();
    if (pay()) { setDone(false); window.GAME.begin(); }
    else { renderWallet(); renderDetail(); openSheet(); }
  });
  $('back').addEventListener('click', showList);

  function openSheet() {
    $('sheetCost').textContent = CHAPTER_COST;
    $('sheetCap').textContent = ENERGY_CAP;
    $('promoMsg').textContent = '';
    $('promoMsg').className = '';
    $('promoInput').value = '';
    $('promoBtn').disabled = true;
    $('sheet').hidden = false;
    $('sheetClose').focus({ preventScroll: true });
  }
  function closeSheet() {
    $('sheet').hidden = true;
    renderWallet();
    if (openStory) renderDetail(); else renderList();
  }
  $('energyChip').addEventListener('click', openSheet);
  $('coinChip').addEventListener('click', openSheet);
  $('scrim').addEventListener('click', closeSheet);
  $('sheetClose').addEventListener('click', closeSheet);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('sheet').hidden) closeSheet(); });
  // Нажатия в меню не должны доходить до игры, иначе пропадает реплика
  $('sheet').addEventListener('click', (e) => e.stopPropagation());
  $('menu').addEventListener('click', (e) => e.stopPropagation());

  $('promoInput').addEventListener('input', (e) => { $('promoBtn').disabled = !e.target.value.trim(); });
  $('promo').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('promoInput').value.trim().toLowerCase().replace(/^@/, '');
    const msg = $('promoMsg');
    if (!code) return;
    const prize = Object.hasOwn(PROMOS, code) ? PROMOS[code] : null;
    if (!prize) {
      msg.textContent = 'Такого кода нет. Проверь, как написан.';
      msg.className = 'bad';
      return;
    }
    if (wallet.promos.includes(code)) {
      msg.textContent = 'Этот код уже использован.';
      msg.className = 'bad';
      return;
    }
    regen();
    wallet.energy += prize.energy;
    wallet.coins += prize.coins;
    wallet.promos.push(code);
    saveWallet();
    renderWallet();
    msg.textContent = `Есть: ${num(prize.coins)} монет и ${num(prize.energy)} энергии.`;
    msg.className = 'ok';
    $('promoInput').value = '';
    $('promoBtn').disabled = true;
  });

  setInterval(() => {
    if ($('menu').hidden) return;
    renderWallet();
    if (openStory && !$('restart').classList.contains('sure')) renderDetail();
  }, 1000);

  document.title = APP_NAME;
  window.MENU = { open, payForChapter: pay, markFinished: () => setDone(true) };
  open();
})();
