// Звуки без файлов: всё синтезируется на месте, поэтому игра не тяжелеет.
// Браузер разрешает звук только после первого нажатия, до него всё молчит.
(() => {
  const KEY = 'sound-off';
  // Что слышно на каждом фоне. rain: дождь снаружи, rainIn: дождь за окном, fire: костёр, wind: ветер
  const AIR = {
    station: ['rain'], bridge: ['rain'], house: ['rain'], parking: ['rain'], porch: ['rain'],
    car: ['rainIn'], roomNight: ['rainIn'], lake: ['fire', 'wind'], boat: ['fireFar', 'wind'],
    pier: ['wind'], bridgeDay: ['wind'],
  };
  const LEVEL = { rain: .07, rainIn: .035, fire: .05, fireFar: .02, wind: .035 };

  let ctx = null, master = null, noise = null;
  let on = true;
  try { on = localStorage.getItem(KEY) !== '1'; } catch {}
  let wanted = null;  // какой фон сейчас, пока звук ещё не разрешён
  let layers = [];
  let crackle = null;

  function unlock() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = on ? 1 : 0;
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      setAmbient(wanted);
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  addEventListener('pointerdown', unlock, { capture: true });
  addEventListener('keydown', unlock, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') ctx.suspend();
    else ctx.resume();
  });

  function filter(type, hz, q = .7) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = hz;
    f.Q.value = q;
    return f;
  }
  function chain(...nodes) {
    nodes.reduce((a, b) => (a.connect(b), b));
    return nodes[nodes.length - 1];
  }

  function makeLayer(kind) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(LEVEL[kind], ctx.currentTime + 1.4);
    const extra = [];
    if (kind === 'rain') chain(src, filter('highpass', 900), filter('lowpass', 7000), g, master);
    else if (kind === 'rainIn') chain(src, filter('highpass', 300), filter('lowpass', 1400), g, master);
    else if (kind === 'wind') {
      const lp = filter('lowpass', 420);
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = .09;
      depth.gain.value = 180;
      chain(lfo, depth);
      depth.connect(lp.frequency);
      lfo.start();
      extra.push(lfo);
      chain(src, lp, g, master);
    } else chain(src, filter('lowpass', 520), g, master); // ровный гул огня
    src.start(0, Math.random() * 2);
    return { src, g, extra };
  }

  function startCrackle(level) {
    const tick = () => {
      if (ctx.state === 'running') burst({ type: 'bandpass', hz: 1400 + Math.random() * 2600, q: 3, gain: level * (.4 + Math.random()), time: .03 + Math.random() * .05 });
      crackle = setTimeout(tick, 90 + Math.random() * 620);
    };
    tick();
  }

  function setAmbient(id) {
    wanted = id;
    if (!ctx) return;
    clearTimeout(crackle);
    const now = ctx.currentTime;
    for (const l of layers) {
      l.g.gain.cancelScheduledValues(now);
      l.g.gain.setValueAtTime(l.g.gain.value, now);
      l.g.gain.linearRampToValueAtTime(0, now + 1);
      l.src.stop(now + 1.1);
      l.extra.forEach((x) => x.stop(now + 1.1));
    }
    const kinds = AIR[id] || [];
    layers = kinds.map(makeLayer);
    if (kinds.includes('fire')) startCrackle(.12);
    if (kinds.includes('fireFar')) startCrackle(.04);
  }

  // Короткий шорох шума
  function burst({ type = 'bandpass', hz = 1000, q = 1, gain = .1, time = .1, delay = 0 }) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + time);
    chain(src, filter(type, hz, q), g, master);
    src.start(t, Math.random() * 2, time + .02);
  }
  // Короткая нота, удар или низкий толчок
  function tone({ from, to = from, gain = .1, time = .2, delay = 0, type = 'sine' }) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + time);
    const g = ctx.createGain();
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + time);
    chain(o, g, master);
    o.start(t);
    o.stop(t + time + .02);
  }

  const FX = {
    thud() { tone({ from: 110, to: 48, gain: .42, time: .24 }); burst({ type: 'lowpass', hz: 500, gain: .1, time: .07 }); },
    shake() { tone({ from: 80, to: 36, gain: .5, time: .45 }); burst({ type: 'lowpass', hz: 700, gain: .16, time: .2 }); },
    rumble() { burst({ type: 'lowpass', hz: 130, q: 1, gain: .75, time: 1.4 }); },
    // сердце: два глухих удара
    pulse() {
      tone({ from: 70, to: 42, gain: .5, time: .17 });
      tone({ from: 62, to: 38, gain: .38, time: .2, delay: .27 });
    },
    chill() {
      tone({ from: 988, to: 932, gain: .018, time: 1.8 });
      burst({ type: 'bandpass', hz: 3400, q: 2, gain: .03, time: 1.3 });
    },
    flash() { burst({ type: 'highpass', hz: 2200, gain: .03, time: .6 }); },
  };

  window.SOUND = {
    ambient: setAmbient,
    fx: (name) => { if (FX[name]) FX[name](); },
    tap: () => burst({ hz: 2100, q: 1.2, gain: .025, time: .035 }),
    choice: () => { tone({ from: 310, to: 190, gain: .11, time: .1 }); burst({ hz: 1500, gain: .03, time: .04 }); },
    memo: () => { tone({ from: 587, gain: .045, time: .34 }); tone({ from: 880, gain: .04, time: .5, delay: .13 }); },
    paper: () => {
      burst({ hz: 2600, q: .8, gain: .07, time: .22 });
      burst({ hz: 3400, q: .8, gain: .05, time: .3, delay: .24 });
      burst({ hz: 2200, q: .8, gain: .05, time: .26, delay: .62 });
    },
    isOn: () => on,
    toggle() {
      on = !on;
      try { on ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, '1'); } catch {}
      if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, .04);
      return on;
    },
    state: () => (ctx ? ctx.state : 'none'),
  };
})();
