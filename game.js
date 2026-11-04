(() => {
  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), box = $('box'), who = $('who'), text = $('text'), sprite = $('sprite');
  const choices = $('choices'), nameForm = $('nameForm'), nameInput = $('nameInput');
  const letter = $('letter'), menu = $('menu'), exitBtn = $('exit');
  const chapter = $('chapter'), memo = $('memo');

  const NAMES = { mia: 'Мия', karen: 'Карен', norman: 'Норман', ethan: 'Итан', jane: 'Джейн', dustin: 'Дастин', richard: 'Ричард', logan: 'Логан' };
  const ACCENT = { mia: '#d9c27a', norman: '#d9a25f', richard: '#8fb7d6', dustin: '#c76a7c', logan: '#8db07a', ethan: '#a6a9d8', jane: '#e08abf', karen: '#d7b48a', heroine: '#e6c98a' };
  const LOVE = ['ethan', 'dustin', 'richard', 'logan'];
  const SAVE_KEY = 'blackwood-save-v1';
  // Временные фоны. Когда картинка появится в assets/bg/<id>.webp, id добавляется сюда
  const READY_BG = ['station', 'car', 'bridge', 'house', 'room', 'roomNight', 'corridor', 'board', 'parking', 'archive', 'porch', 'kitchen', 'dinner'];
  const BG = {
    station: { rain: true, css: 'radial-gradient(90% 40% at 70% 18%, #3b4a58, transparent), linear-gradient(#17212b, #0a1016 70%)' },
    car: { css: 'radial-gradient(70% 30% at 50% 88%, #2a2118, transparent), linear-gradient(#0a0e13, #05070a)' },
    bridge: { rain: true, pos: 'right 14px center', css: 'radial-gradient(70% 34% at 50% 34%, #4b5b66, transparent), linear-gradient(#10181f, #070b0f)' },
    house: { rain: true, css: 'radial-gradient(12% 8% at 62% 30%, #d9a25f, transparent), linear-gradient(#141d26, #07090d 72%)' },
    room: { css: 'radial-gradient(70% 34% at 40% 26%, #5a4a39, transparent), linear-gradient(#211c19, #0d0c0c)' },
    roomNight: { rain: true, css: 'radial-gradient(40% 22% at 34% 56%, #4b3a2a, transparent), linear-gradient(#0d1219, #050609)' },
    corridor: { css: 'radial-gradient(80% 30% at 50% 14%, #7a8791, transparent), linear-gradient(#333d46, #151a1f)' },
    board: { css: 'radial-gradient(70% 34% at 40% 26%, #6a6253, transparent), linear-gradient(#2c3236, #12161a)' },
    parking: { rain: true, css: 'radial-gradient(80% 30% at 30% 16%, #5a6b78, transparent), linear-gradient(#1b252e, #0b1014)' },
    archive: { css: 'radial-gradient(34% 22% at 62% 18%, #8d7446, transparent), linear-gradient(#1b1a17, #09090a)' },
    porch: { rain: true, css: 'radial-gradient(40% 24% at 74% 22%, #a97d48, transparent), linear-gradient(#18202a, #080b0f)' },
    kitchen: { css: 'radial-gradient(90% 40% at 50% 20%, #a07a4d, transparent), linear-gradient(#3a2c20, #17110c)' },
    dinner: { css: 'radial-gradient(50% 26% at 50% 12%, #c49a62, transparent), linear-gradient(#2a241e, #0e0c0b)' },
    lake: { css: 'radial-gradient(34% 20% at 50% 70%, #b5652c, transparent), linear-gradient(#0d141c, #111821 55%, #08090b)' },
    pier: { css: 'radial-gradient(60% 18% at 70% 22%, #39505f, transparent), linear-gradient(#0a1016, #05080b)' },
  };

  let rainOn = true;
  let path = [];      // стек позиций: [{ list, i }]
  let state = { name: '', pts: {} };
  let reveal = null;
  let waiting = null; // что делает тап
  let curBg = null, bgLayer = 0;

  const fill = (s) => s.replaceAll('{имя}', state.name || 'Птица');

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify({ state, trail: trailOf(), bg: curBg, sprite: sprite.dataset.key || '' })); } catch {}
  }
  function trailOf() {
    return path.map((f) => ({ i: f.i, via: f.via }));
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
  }
  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch {}
  }

  function setBg(id) {
    if (id === curBg) return;
    curBg = id;
    const def = BG[id] || {};
    const el = bgLayer ? $('bg') : $('bg2');
    const old = bgLayer ? $('bg2') : $('bg');
    bgLayer = 1 - bgLayer;
    el.style.backgroundImage = def.css || '';
    el.style.backgroundPosition = def.pos || '';
    if (READY_BG.includes(id)) el.style.backgroundImage = `url(assets/bg/${id}.webp)`;
    el.classList.add('on');
    old.classList.remove('on');
    rainOn = !!def.rain;
  }

  function setSprite(whoKey, emo) {
    if (!whoKey) { sprite.classList.remove('on'); sprite.dataset.key = ''; return; }
    const key = `${whoKey}_${emo}`;
    if (sprite.dataset.key === key) return;
    sprite.dataset.key = key;
    sprite.classList.toggle('left', whoKey === 'heroine');
    sprite.classList.toggle('right', whoKey !== 'heroine');
    sprite.style.height = whoKey === 'karen' ? '90%' : '';
    sprite.classList.remove('on');
    const url = `assets/sprites/${key}.webp`;
    if (sprite.getAttribute('src') === url && sprite.complete && sprite.naturalWidth) { sprite.classList.add('on'); return; }
    sprite.onload = () => { if (sprite.dataset.key === key) sprite.classList.add('on'); };
    sprite.src = url;
  }

  function showOnly(el) {
    for (const x of [box, choices, nameForm, letter, chapter]) x.hidden = x !== el;
  }

  // Текст появляется по нескольку слов, а окно сразу занимает итоговый размер.
  // Первый тап показывает всё, следующий ведёт дальше.
  function showText(str, done) {
    clearInterval(reveal);
    box.classList.remove('done');
    text.textContent = '';
    const words = str.split(' ').filter(Boolean).map((w, idx, all) => {
      const s = document.createElement('span');
      s.textContent = w + (idx < all.length - 1 ? ' ' : '');
      text.append(s);
      return s;
    });
    const finish = () => {
      clearInterval(reveal);
      words.forEach((s) => s.classList.add('on'));
      box.classList.add('done');
      done();
    };
    if (!words.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return finish();
    let k = 0;
    const tick = () => {
      for (let n = 0; n < 2 && k < words.length; n++) words[k++].classList.add('on');
      if (k >= words.length) finish();
    };
    tick();
    if (k < words.length) { reveal = setInterval(tick, 130); waiting = finish; }
  }

  function next() {
    while (path.length) {
      const f = path[path.length - 1];
      if (f.i < f.list.length) { const step = f.list[f.i++]; run(step); return; }
      path.pop();
    }
  }

  function run(step) {
    switch (step.type) {
      case 'bg': setBg(step.id); return next();
      case 'hide': setSprite(null); return next();
      case 'line': return line(step);
      case 'choice': return choose(step);
      case 'name': return askName();
      case 'letter': return showLetter(step);
      case 'if': return branch(step);
      case 'chapter': return showChapter(step);
      case 'end': return theEnd(step);
    }
  }

  // Эффекты: класс перезапускается, чтобы анимация шла каждый раз
  function playFx(name) {
    const target = { pulse: $('pulse'), chill: $('chill'), flash: $('flash') }[name] || $('scene');
    const cls = 'fx-' + name;
    target.classList.remove('fx-shake', 'fx-thud', 'fx-rumble', cls);
    void target.offsetWidth;
    target.classList.add(cls);
  }

  function line(step) {
    showOnly(box);
    // Герой в кадре только на своей реплике
    if (step.hide || !(step.speak || step.isMe)) setSprite(null);
    else setSprite(step.who, step.emo);
    who.textContent = (step.isMe ? state.name || 'Я' : (step.speak ? NAMES[step.who] : ''));
    const tone = step.isMe ? 'heroine' : step.speak ? step.who : '';
    box.classList.toggle('speech', !!tone);
    box.classList.toggle('story', !tone);
    box.style.setProperty('--accent', ACCENT[tone] || 'transparent');
    (step.fx || '').split(' ').filter(Boolean).forEach(playFx);
    save();
    $('sr').textContent = (who.textContent ? who.textContent + ': ' : '') + fill(step.t);
    showText(fill(step.t), () => { waiting = next; });
  }

  function branch(step) {
    const idx = step.test(state.pts) ? 0 : 1;
    const parent = path[path.length - 1];
    parent.via = (parent.via || []).concat([[parent.i - 1, idx]]);
    path.push({ list: step.options[idx].then, i: 0 });
    next();
  }

  // Новая глава стоит энергию. Не хватает: прогресс остаётся здесь, игрок уходит в меню ждать
  function showChapter(step) {
    if (!state.paid) state.paid = [];
    state.chapter = { num: step.num, title: step.title };
    if (!state.paid.includes(step.num)) {
      if (!window.MENU.payForChapter()) {
        state.locked = true;
        save();
        window.MENU.open();
        return;
      }
      state.paid.push(step.num);
    }
    state.locked = false;
    showOnly(chapter);
    setSprite(null);
    chapter.querySelector('small').textContent = step.n;
    chapter.querySelector('h2').textContent = step.title;
    chapter.querySelector('p').textContent = '';
    save();
    waiting = next;
  }

  // Что герой запомнил: плюс это или минус, игрок узнаёт только по тому, как тот будет вести себя дальше
  function remember(set) {
    const key = Object.keys(set || {}).find((k) => LOVE.includes(k));
    if (!key) return;
    memo.textContent = `${NAMES[key]} это запомнит`;
    memo.classList.remove('on');
    void memo.offsetWidth;
    memo.classList.add('on');
  }

  function choose(step) {
    showOnly(choices);
    choices.textContent = '';
    choices.classList.toggle('popup', !!step.prompt);
    if (step.prompt) { const h = document.createElement('h2'); h.textContent = step.prompt; choices.append(h); }
    step.options.forEach((o, idx) => {
      if (o.when && !o.when(state.pts)) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = fill(o.t);
      b.onclick = (e) => {
        e.stopPropagation();
        for (const [k, v] of Object.entries(o.set || {})) state.pts[k] = (state.pts[k] || 0) + v;
        remember(o.set);
        const parent = path[path.length - 1];
        parent.via = (parent.via || []).concat([[parent.i - 1, idx]]);
        path.push({ list: o.then || [], i: 0 });
        choices.hidden = true;
        next();
      };
      choices.append(b);
    });
    waiting = null;
    save();
    choices.querySelector('button').focus({ preventScroll: true });
  }

  function askName() {
    showOnly(nameForm);
    waiting = null;
    nameInput.value = '';
    nameForm.querySelector('button').disabled = true;
    nameInput.focus({ preventScroll: true });
  }
  nameInput.addEventListener('input', () => {
    nameForm.querySelector('button').disabled = !nameInput.value.trim();
  });
  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = nameInput.value.trim();
    if (!v) return;
    state.name = v;
    nameInput.blur();
    nameForm.hidden = true;
    next();
  });
  nameForm.addEventListener('click', (e) => e.stopPropagation());

  function showLetter(step) {
    showOnly(letter);
    setSprite(null);
    letter.textContent = '';
    const sheet = document.createElement('div');
    sheet.className = 'sheet';
    letter.append(sheet);
    const ps = step.lines.map((l) => { const p = document.createElement('p'); p.textContent = l; sheet.append(p); return p; });
    let k = 0;
    const reveal = () => {
      if (k < ps.length) { ps[k++].classList.add('on'); waiting = k < ps.length ? reveal : () => next(); }
    };
    waiting = null;
    setTimeout(reveal, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1500);
    save();
  }

  function theEnd(step) {
    clearSave();
    window.MENU.markFinished();
    showOnly(chapter);
    setSprite(null);
    chapter.querySelector('small').textContent = '';
    chapter.querySelector('h2').textContent = step.title;
    chapter.querySelector('p').textContent = 'Продолжение пишется.';
    waiting = () => window.MENU.open();
  }

  function begin() {
    menu.hidden = true;
    state = { name: '', pts: {}, chapter: { num: 1, title: 'Приезд' }, paid: [1] };
    path = [{ list: window.STORY, i: 0 }];
    curBg = null;
    clearSave();
    showOnly(null);
    next();
  }

  // Восстановление: проходим историю заново без показа
  function restore(s) {
    menu.hidden = true;
    state = s.state;
    path = [{ list: window.STORY, i: 0, via: [] }];
    const t = s.trail;
    path = [];
    let list = window.STORY;
    for (const f of t) {
      const frame = { list, i: f.i, via: f.via };
      path.push(frame);
      const last = (f.via || []).slice(-1)[0];
      if (last && list[last[0]]) list = list[last[0]].options[last[1]].then || [];
    }
    if (s.bg) setBg(s.bg);
    if (s.sprite) { const [a, b] = s.sprite.split('_'); setSprite(a, b); }
    const top = path[path.length - 1];
    if (top) top.i = Math.max(0, top.i - 1);
    next();
  }

  function tap() {
    if (!menu.hidden) return;
    if (waiting) { const w = waiting; waiting = null; w(); }
  }
  stage.addEventListener('click', tap);
  addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && e.target === document.body) { e.preventDefault(); tap(); }
  });

  // Выход в меню: всё и так сохранено на каждой реплике
  exitBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearInterval(reveal);
    waiting = null;
    window.MENU.open();
  });

  function toMenu() {
    clearInterval(reveal);
    waiting = null;
    showOnly(null);
    setSprite(null);
  }
  window.GAME = { begin, resume: () => restore(load()), saved: load, toMenu };
  setBg('station');

  // Дождь
  const cv = $('rain'), ctx = cv.getContext('2d');
  const drops = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), v: .9 + Math.random() * .9, l: 12 + Math.random() * 18 }));
  let last = 0;
  function frame(t) {
    const dt = Math.min(40, t - last) / 1000; last = t;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== w) { cv.width = w; cv.height = h; }
    ctx.clearRect(0, 0, w, h);
    if (rainOn) {
      ctx.strokeStyle = 'rgba(190,210,225,.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of drops) {
        d.y += d.v * dt; if (d.y > 1.05) { d.y = -.05; d.x = Math.random(); }
        const x = d.x * w, y = d.y * h;
        ctx.moveTo(x, y); ctx.lineTo(x - 1.6, y + d.l);
      }
      ctx.stroke();
    }
    requestAnimationFrame(frame);
  }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(frame);

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
