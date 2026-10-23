/* =========================================================
   Istana Mulut Putri Iris — buku cerita interaktif & teman makan
   Tanpa dependensi, tanpa build. Semua progres disimpan di perangkat.
   ========================================================= */
(() => {
'use strict';

/* ---------- utilitas ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function h(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v);
  }
  kids.flat().forEach(c => e.append(c));
  return e;
}

/* Timer terkelola: semua jeda dibersihkan saat pindah halaman/layar,
   sehingga urutan animasi yang tertunda tidak "bocor" ke layar lain. */
const timers = new Set();
function later(fn, ms) {
  const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
  timers.add(id);
  return id;
}
const wait = ms => new Promise(res => later(res, ms));
function clearTimers() { timers.forEach(clearTimeout); timers.clear(); }

/* ---------- penyimpanan ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('iris.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('iris.' + k, JSON.stringify(v)); } catch { /* mode privat */ } }
};
const localDay = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

const S = {
  stars: store.get('stars', 0),
  sound: store.get('sound', true),
  autoRead: store.get('autoRead', true),
  goal: store.get('goal', 15)
};
let bitesRec = store.get('bites', null);
if (!bitesRec || bitesRec.d !== localDay()) bitesRec = { d: localDay(), n: 0, fin: 0 };
const saveBites = () => store.set('bites', bitesRec);

/* ---------- tokoh & data ---------- */
const P = {
  snow:  { emoji: '🍎', name: 'Snow White', role: 'Gerbang Depan',  color: '#e11d48' },
  mulan: { emoji: '🗡️', name: 'Mulan',      role: 'Geraham Kanan',  color: '#059669' },
  belle: { emoji: '🌹', name: 'Belle',      role: 'Geraham Kiri',   color: '#d97706' },
  cinde: { emoji: '👠', name: 'Cinderella', role: 'Perosotan Emas', color: '#0284c7' }
};

const FOODS = [
  { id: 'nasigoreng', name: 'Nasi Goreng', short: 'N. Goreng', emoji: '🍛', tough: true,  target: 8, desc: 'Nasi goreng! Oper ke Mulan & Belle supaya digiling sampai lembut.' },
  { id: 'ayam',       name: 'Ayam',        emoji: '🍗', tough: true,  target: 8, desc: 'Ayam gurih bikin Iris kuat! Mulan & Belle paling suka menggiling ayam.' },
  { id: 'telur',      name: 'Telur',       emoji: '🍳', tough: true,  target: 6, desc: 'Telur bergizi! Kunyah di geraham belakang sampai halus.' },
  { id: 'buah',       name: 'Buah',        emoji: '🍎', tough: false, target: 6, desc: 'Buah favorit Snow White! Iris sudah jago mengunyahnya.' },
  { id: 'udon',       name: 'Udon',        emoji: '🍜', tough: false, target: 6, desc: 'Udon lembut kesukaan Iris. Tetap mampir ke Mulan & Belle dulu ya.' },
  { id: 'donat',      name: 'Donat',       emoji: '🍩', tough: false, target: 6, desc: 'Donat empuk kesukaan Iris! Kunyah rapi tanpa tolah-toleh.' },
  { id: 'pempek',     name: 'Pempek',      emoji: '🥟', tough: false, target: 7, desc: 'Pempek kulit yang kenyal saja Iris bisa. Apalagi yang lain!' }
];

const GREET = {
  snow:  'Halo Putri Iris kesayanganku! Aku senang sekali kalau Iris menyuap makanan sendiri dengan Sendok Sihir!',
  mulan: 'Hai Putri Iris! Oper ayam dan nasi gorengnya ke pojok belakang ya, biar kugiling sampai halus!',
  belle: 'Halo Putri Iris yang pintar! Aku jaga geraham yang satunya. Kita kunyah sama-sama sampai lembut!',
  cinde: 'Kalau makanannya sudah halus, jangan ditahan di pipi ya! Satu, dua, tiga, glek!'
};

const CUES = {
  focus:   ['snow',  'Iris, lampu istana mulai redup! Yuk lihat piringnya, kita nyalakan lagi lampunya.'],
  posture: ['cinde', 'Ups, lantai istana goyang! Duduk anggun menghadap piring dulu ya, Putri Iris.'],
  spoon:   ['snow',  'Waktunya Tongkat Sihir Sendok! Putri Iris suap sendiri ya.'],
  chew:    ['mulan', 'Mulan dan Belle mengantuk! Oper makanannya ke geraham belakang, kita bangunkan: kres, kres, kres!'],
  swallow: ['cinde', 'Ting! Makanannya sudah halus. Satu, dua, tiga, glek! Meluncur ke perut!']
};

const PRAISE = [
  'Hebat, Putri Iris!', 'Suapan keren!', 'Snow White tepuk tangan!', 'Mulan dan Belle bangga!',
  'Cinderella bilang: mantap!', 'Wah, istananya bersinar!', 'Putri Iris pintar sekali!'
];

/* ---------- suara ---------- */
let ac = null;
function actx() {
  if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (C) ac = new C(); }
  if (ac && ac.state === 'suspended') ac.resume();
  return ac;
}
function tone(type, f0, f1, dur, vol = .2, at = 0) {
  const c = actx(); if (!c) return;
  const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .03);
}
function noise(dur, vol, at = 0, freq = 2000) {
  const c = actx(); if (!c) return;
  const t = c.currentTime + at, len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; g.gain.value = vol;
  src.connect(f).connect(g).connect(c.destination); src.start(t);
}
const sfx = {
  chew()    { noise(.08, .5, 0, 2200); tone('triangle', 300, 150, .1, .16); },
  sparkle() { [523, 659, 784, 1047].forEach((f, i) => tone('sine', f, f, .22, .14, i * .07)); },
  swallow() { tone('sine', 700, 200, .45, .22); },
  wobble()  { tone('sawtooth', 210, 140, .25, .1); },
  pop()     { tone('sine', 500, 900, .1, .18); },
  tick()    { tone('square', 880, 880, .09, .07); },
  bell()    { tone('sine', 1320, 1320, .6, .16); tone('sine', 1760, 1760, .5, .08, .02); },
  fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone('triangle', f, f, .26, .16, i * .12)); }
};
function play(name) { if (!S.sound) return; try { sfx[name](); } catch { /* abaikan */ } }

/* Suara narator (Web Speech API, id-ID bila tersedia) */
const hasSpeech = 'speechSynthesis' in window;
let voice = null;
function pickVoice() {
  if (!hasSpeech) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => /^id[-_]ID/i.test(v.lang)) || vs.find(v => /^id/i.test(v.lang)) || null;
}
if (hasSpeech) { pickVoice(); try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch { /* abaikan */ } }
function say(text) {
  if (!S.sound || !hasSpeech || !text) return;
  try {
    speechSynthesis.cancel();
    (text.match(/[^.!?]+[.!?]*/g) || [text]).map(s => s.trim()).filter(Boolean).forEach(part => {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = 'id-ID'; if (voice) u.voice = voice; u.rate = .92; u.pitch = 1.15;
      speechSynthesis.speak(u);
    });
  } catch { /* abaikan */ }
}
function hush() { if (hasSpeech) { try { speechSynthesis.cancel(); } catch { /* abaikan */ } } }

/* ---------- toast, bintang, konfeti ---------- */
let toastT = 0;
function toast(av, name, msg, speak = true) {
  const t = $('#toast');
  $('#toastAv').textContent = av; $('#toastName').textContent = name; $('#toastMsg').textContent = msg;
  t.hidden = false; t.classList.remove('out');
  clearTimeout(toastT);
  toastT = setTimeout(hideToast, Math.max(3800, msg.length * 75));
  if (speak) say(msg);
}
function hideToast() {
  const t = $('#toast'); t.classList.add('out');
  setTimeout(() => { if (t.classList.contains('out')) t.hidden = true; }, 260);
}
$('#toast').addEventListener('click', hideToast);
function princess(key, msg, speak = true) { const p = P[key]; toast(p.emoji, `${p.name} · ${p.role}`, msg, speak); }

function updateStars(bump) {
  $('#starCount').textContent = S.stars;
  if (bump) { const p = $('.stars-pill'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
}
function addStars(n) { S.stars += n; store.set('stars', S.stars); updateStars(true); }

function confetti(n = 36) {
  const fx = $('#fx'), E = ['⭐', '✨', '👑', '🌸', '💖', '🎀', '🌟'];
  for (let i = 0; i < n; i++) {
    const s = h('span', {}, E[i % E.length]);
    s.style.left = Math.random() * 100 + '%';
    fx.append(s);
    const dx = (Math.random() - .5) * 200;
    const a = s.animate([
      { transform: 'translate(0,-8vh) rotate(0deg)', opacity: 1 },
      { transform: `translate(${dx}px,112vh) rotate(${Math.random() * 720 - 360}deg)`, opacity: 1 }
    ], { duration: 1800 + Math.random() * 1800, delay: Math.random() * 500, easing: 'cubic-bezier(.3,.5,.6,1)', fill: 'backwards' });
    a.onfinish = () => s.remove();
  }
}

async function countdown(text) {
  const c = $('#countdown'); c.innerHTML = ''; c.append(h('span', {}, text)); c.classList.add('show');
}
function endCountdown() { const c = $('#countdown'); c.classList.remove('show'); c.innerHTML = ''; }

/* ---------- elemen gambar interaktif ---------- */
function mountFrame(stage, src, alt) {
  stage.innerHTML = '';
  const layer = h('div', { class: 'layer' });
  const frame = h('div', { class: 'frame' }, h('img', { src, alt, decoding: 'async', draggable: 'false' }), layer);
  stage.append(frame);
  return { frame, layer };
}
function avatar(layer, key, x, y, { onTap, pulse = true, d = 0 } = {}) {
  const p = P[key];
  const b = h('button', { class: 'av' + (pulse ? ' pulse' : ''), style: `left:${x}%;top:${y}%;--c:${p.color};--d:${d}s`, 'aria-label': `${p.name}, ${p.role}` },
    h('span', { class: 'av-face' }, p.emoji), h('span', { class: 'av-name' }, p.name));
  b.addEventListener('click', () => onTap && onTap(b));
  layer.append(b); return b;
}
function hot(layer, x, y, w, ht, { onTap, pulse = true, label = '' } = {}) {
  const b = h('button', { class: 'hot' + (pulse ? ' pulse' : ''), style: `left:${x}%;top:${y}%;width:${w}%;height:${ht}%`, 'aria-label': label });
  b.addEventListener('click', onTap);
  layer.append(b); return b;
}
function floatText(layer, text, x, y) {
  const e = h('div', { class: 'float-text', style: `left:${x}%;top:${y}%` }, text);
  layer.append(e);
  const a = e.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-130%) scale(1.15)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-260%) scale(1)', opacity: 0 }], { duration: 900, easing: 'ease-out' });
  a.onfinish = () => e.remove();
}
function fly(layer, emoji, from, to, ms = 750) {
  const e = h('div', { class: 'fly' }, emoji);
  e.style.left = from[0] + '%'; e.style.top = from[1] + '%';
  layer.append(e);
  const a = e.animate([
    { left: from[0] + '%', top: from[1] + '%', transform: 'translate(-50%,-50%) scale(1)' },
    { left: (from[0] + to[0]) / 2 + '%', top: Math.min(from[1], to[1]) - 14 + '%', transform: 'translate(-50%,-50%) scale(1.3)', offset: .5 },
    { left: to[0] + '%', top: to[1] + '%', transform: 'translate(-50%,-50%) scale(.35)', opacity: .3 }
  ], { duration: ms, easing: 'ease-in-out' });
  a.onfinish = () => e.remove();
}

/* gumpalan makanan yang berpindah di dalam istana mulut */
const POS = { carpet: [52, 77], left: [19, 46], right: [88, 46], slideTop: [63, 30], slideBase: [62, 54], mouth: [50, 37] };
function bolus(layer, emoji) {
  const el = h('div', { class: 'bolus hide' }, h('span', {}, emoji));
  layer.append(el);
  const api = {
    el,
    to(k) { const [x, y] = POS[k]; el.style.left = x + '%'; el.style.top = y + '%'; },
    emoji(e) { el.firstChild.textContent = e; },
    show() { el.classList.remove('hide'); },
    hide() { el.classList.add('hide'); },
    soft(on = true) { el.classList.toggle('soft', on); },
    bounce() { el.classList.remove('bounce'); void el.offsetWidth; el.classList.add('bounce'); },
    reset(e) { el.style.transition = 'none'; api.soft(false); api.emoji(e); api.to('carpet'); void el.offsetWidth; el.style.transition = ''; },
    async slide() {
      api.show(); api.to('slideTop'); await wait(600);
      el.style.transition = 'left .95s ease-in, top .95s ease-in, transform .95s ease-in, opacity .95s ease-in';
      api.to('slideBase'); el.classList.add('hide'); await wait(1000);
      el.style.transition = '';
    }
  };
  api.to('carpet');
  return api;
}

/* hitung mundur + luncur: dipakai bab 5 dan mode makan */
async function swallowSequence(b) {
  for (const n of ['3', '2', '1']) { countdown(n); play('tick'); await wait(750); }
  countdown('GLEK!'); play('swallow');
  await wait(250);
  endCountdown();
  await b.slide();
}

/* =========================================================
   LAYAR & NAVIGASI
   ========================================================= */
let current = 'home';
const TITLES = { home: 'Istana Mulut Putri Iris', story: 'Buku Cerita', meal: 'Teman Makan' };

function show(name) {
  leaveScreen(current);
  current = name;
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  $('#tbTitle').textContent = TITLES[name];
  $('#btnHome').style.visibility = name === 'home' ? 'hidden' : 'visible';
  if (name === 'home') enterHome();
  if (name === 'story') enterStory();
  if (name === 'meal') enterMeal();
  wake(name !== 'home');
}
function leaveScreen(name) {
  hush(); clearTimers(); endCountdown(); hideToast();
  if (name === 'story') unmountPage();
  if (name === 'meal') leaveMeal();
}

/* layar tetap menyala saat bercerita / makan */
let wl = null;
async function wake(on) {
  try {
    if (on) {
      if (!wl && 'wakeLock' in navigator) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
    } else if (wl) { await wl.release(); wl = null; }
  } catch { /* tidak didukung */ }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && current !== 'home') wake(true); });

/* ---------- beranda ---------- */
function enterHome() {
  const bits = [];
  if (S.stars) bits.push(`🌟 ${S.stars} bintang`);
  if (bitesRec.n) bits.push(`🍽️ ${bitesRec.n} suapan makan ini`);
  const foot = $('#homeFoot');
  foot.hidden = !bits.length; foot.textContent = bits.join('  ·  ');
}

/* =========================================================
   BUKU CERITA — 7 BAB
   ========================================================= */
const PAGES = [
  {
    chapter: 'Bab 1 dari 7 · Rahasia Kerajaan',
    title: 'Selamat Datang di Istana Mulut Putri Iris!',
    text: 'Tahukah Iris? Di dalam mulut Iris ada <strong>istana ajaib</strong>! Empat sahabat Princess tinggal di sana dan siap membantu Iris makan. Ayo kenalan!',
    speech: 'Halo Putri Iris yang sebentar lagi berusia lima tahun! Di dalam mulut Iris ada istana ajaib. Empat sahabat Princess tinggal di sana dan siap membantu Iris makan. Ayo kenalan!',
    mount(c) {
      const { layer } = c.frame('assets/palace.webp', 'Istana mulut yang ajaib');
      const met = new Set();
      c.mission('Ketuk 4 Princess untuk menyapa', 4);
      Object.entries({ snow: [37, 36], mulan: [19, 67], belle: [88, 67], cinde: [74, 62] }).forEach(([k, [x, y]], i) => {
        avatar(layer, k, x, y, {
          d: i * .4,
          onTap: b => {
            play('pop'); princess(k, GREET[k]);
            if (!met.has(k)) { met.add(k); b.classList.add('met'); b.classList.remove('pulse'); c.progress(met.size); if (met.size === 4) c.done(2); }
          }
        });
      });
    }
  },
  {
    chapter: 'Bab 2 dari 7 · Tongkat Sihir Sendok',
    title: 'Putri Hampir 5 Tahun Pegang Sendok Sendiri!',
    text: '<strong>Snow White</strong> tersenyum: “Putri Iris sudah hampir 5 tahun! Tangan Iris kuat memegang <strong>Sendok Sihir</strong> sendiri.” Setiap suapan mandiri, lampu kristal istana menyala!',
    speech: 'Snow White berkata: Putri Iris sudah hampir lima tahun! Tangan Iris kuat memegang Sendok Sihir sendiri. Setiap suapan mandiri, lampu kristal istana menyala!',
    mount(c) {
      const { layer } = c.frame('assets/hero.webp', 'Putri Iris memegang sendok emas');
      let n = 0;
      const foods = [{ e: '🍛', from: [51, 75] }, { e: '🍳', from: [51, 70] }, { e: '🍗', from: [38, 88] }];
      const lines = ['Satu suapan mandiri! Tangan Putri Iris pintar sekali!', 'Dua! Lampu kristal istana makin terang!', 'Tiga! Wah, Putri Iris benar-benar hebat memegang sendok sendiri!'];
      c.mission('Ketuk sendok emas, suap sendiri 3 kali', 3);
      const spoon = () => {
        const f = foods[n % 3];
        fly(layer, f.e, f.from, POS.mouth); play('pop');
        later(() => play('chew'), 700);
        princess('snow', lines[Math.min(n, 2)]);
        n++; c.progress(Math.min(n, 3)); if (n === 3) c.done(3);
      };
      hot(layer, 64, 41, 14, 30, { onTap: spoon, label: 'Sendok emas' });
      c.act([{ cls: 'snow', label: '🥄 Ambil Suapan Sendiri!', on: spoon }]);
    }
  },
  {
    chapter: 'Bab 3 dari 7 · Duduk Anggun',
    title: 'Jangan Goyang Istana! Duduk Anggun & Fokus',
    text: 'Kalau Iris <strong>tolah-toleh</strong> atau <strong>ngulet</strong>, lantai istana bergoyang! Kalau <strong>bengong</strong>, lampu istana redup. Putri duduk tegap, kaki menapak, mata menghadap piring.',
    speech: 'Kalau Iris tolah-toleh atau ngulet, lantai istana bergoyang! Kalau bengong, lampu istana jadi redup. Putri duduk tegap, kaki menapak, dan mata menghadap piring.',
    mount(c) {
      const { frame, layer } = c.frame('assets/hero.webp', 'Putri Iris duduk di kursi istana');
      const note = h('div', { class: 'tag-pill' }, '👑 Putri Iris duduk anggun!');
      layer.append(note);
      c.mission('Coba semuanya, lalu pilih Duduk Anggun');
      const modes = {
        wiggle:   { cls: 'shake', pill: '😵‍💫 Lantai istana goyang!', who: 'mulan', msg: 'Aduh, lantai istana goyang! Kasihan Snow White hampir jatuh!', snd: 'wobble' },
        daydream: { cls: 'dim',   pill: '😴 Lampu istana redup…',     who: 'belle', msg: 'Lho, lampunya redup. Iris bengong ya? Yuk nyalakan lagi!', snd: 'wobble' },
        graceful: { cls: '',      pill: '👑 Putri Iris duduk anggun!', who: 'snow',  msg: 'Nah begitu! Duduk anggun, istana jadi tenang dan terang benderang!', snd: 'sparkle' }
      };
      const btns = {};
      const setMode = m => {
        const d = modes[m];
        frame.classList.remove('shake', 'dim'); if (d.cls) frame.classList.add(d.cls);
        note.textContent = d.pill; play(d.snd); princess(d.who, d.msg);
        Object.entries(btns).forEach(([k, b]) => b.classList.toggle('sel', k === m));
        if (m === 'graceful') c.done(2);
      };
      c.act([
        { cls: 'belle', label: '🙃 Tolah-toleh / Ngulet', on: () => setMode('wiggle'), ref: b => btns.wiggle = b },
        { cls: 'slate', label: '😶‍🌫️ Bengong', on: () => setMode('daydream'), ref: b => btns.daydream = b },
        { cls: 'pink',  label: '👸 Duduk Anggun!', on: () => setMode('graceful'), ref: b => btns.graceful = b }
      ]);
    }
  },
  {
    chapter: 'Bab 4 dari 7 · Pasukan Geraham',
    title: 'Bangunkan Mulan & Belle di Geraham Belakang!',
    text: 'Nasi goreng, telur, dan ayam harus dioper ke pojok belakang. Di sana <strong>Mulan</strong> dan <strong>Belle</strong> menunggu di tahta gigi geraham. Giling bersama: <em>kres, kres, kres</em> sampai halus seperti bubur bintang!',
    speech: 'Nasi goreng, telur, dan ayam harus dioper ke pojok belakang. Di sana Mulan dan Belle menunggu di tahta gigi geraham. Giling bersama: kres, kres, kres, sampai halus seperti bubur bintang!',
    mount(c) {
      const { layer } = c.frame('assets/palace.webp', 'Dua tahta gigi geraham');
      const T = 6; let n = 0;
      const b = bolus(layer, '🍗'); b.show();
      const bar = h('div', { class: 'softbar' }, h('div', { class: 'softbar-label' }, 'Kelembutan: 0%'), h('div', { class: 'bar' }, h('i')));
      layer.append(bar);
      c.mission('Kunyah 6 kali, kiri dan kanan bergantian', T);
      const sides = {};
      const chew = which => {
        play('chew'); b.to(which === 'left' ? 'left' : 'right'); b.bounce();
        sides[which].classList.remove('chewing'); void sides[which].offsetWidth; sides[which].classList.add('chewing');
        floatText(layer, 'Kres!', which === 'left' ? 19 : 88, 40);
        if (n >= T) return;
        n++; c.progress(n);
        const pct = Math.round(n / T * 100);
        $('.softbar-label', bar).textContent = `Kelembutan: ${pct}%`; $('.bar i', bar).style.width = pct + '%';
        if (n === T) {
          b.emoji('✨'); b.soft(); play('sparkle');
          princess(which === 'left' ? 'mulan' : 'belle', 'Hore! Makanannya sudah halus seperti bubur bintang!');
          c.done(3);
        }
      };
      sides.left = hot(layer, 19, 50, 21, 56, { onTap: () => chew('left'), label: 'Gigi geraham Mulan' });
      sides.right = hot(layer, 88, 50, 21, 56, { onTap: () => chew('right'), label: 'Gigi geraham Belle' });
      avatar(layer, 'mulan', 19, 67, { pulse: false, onTap: () => chew('left') });
      avatar(layer, 'belle', 88, 67, { pulse: false, onTap: () => chew('right') });
      c.act([
        { cls: 'mulan', label: '🗡️ Kunyah Kanan<br>(Mulan)', on: () => chew('left') },
        { cls: 'belle', label: '🌹 Kunyah Kiri<br>(Belle)', on: () => chew('right') }
      ]);
    }
  },
  {
    chapter: 'Bab 5 dari 7 · Perosotan Emas',
    title: 'Sudah Halus? Satu, Dua, Tiga… Glek!',
    text: 'Kalau sudah halus, jangan disimpan di pipi! <strong>Cinderella</strong> membunyikan lonceng: <em>“Ting! Dorong dengan lidah, lalu meluncur di Perosotan Emas ke perut!”</em>',
    speech: 'Kalau sudah halus, jangan disimpan di pipi! Cinderella membunyikan lonceng: Ting! Dorong dengan lidah, lalu meluncur di Perosotan Emas ke perut! Satu, dua, tiga, glek!',
    mount(c) {
      const { layer } = c.frame('assets/palace.webp', 'Perosotan emas Cinderella');
      const b = bolus(layer, '🥣'); b.soft(); b.show();
      let busy = false;
      c.mission('Ketuk Perosotan Emas atau tombol GLEK!');
      const go = async () => {
        if (busy) return; busy = true;
        await swallowSequence(b);
        play('bell'); princess('cinde', 'Satu, dua, tiga, glek! Makanan halus meluncur ke perut!');
        c.done(2);
        await wait(1200); b.reset('🥣'); b.soft(); b.show(); busy = false;
      };
      hot(layer, 62, 40, 16, 40, { onTap: go, label: 'Perosotan emas' });
      avatar(layer, 'cinde', 74, 62, { onTap: go, d: .2 });
      c.act([{ cls: 'cinde', label: '👠 1, 2, 3… GLEK! Meluncur!', on: go }]);
    }
  },
  {
    chapter: 'Bab 6 dari 7 · Rahasia Kehebatan Iris',
    title: 'Iris Sudah Jago! Pasti Bisa Juga!',
    text: '<strong>Belle</strong> berkata: “Gigi geraham Iris sebenarnya <strong>kuat</strong>! Buktinya Iris pintar mengunyah buah, udon, donat, dan pempek kulit. Nasi goreng, telur, dan ayam pasti bisa juga!”',
    speech: 'Belle berkata: Gigi geraham Iris sebenarnya kuat! Buktinya Iris pintar mengunyah buah, udon, donat, dan pempek kulit. Nasi goreng, telur, dan ayam pasti bisa juga!',
    mount(c) {
      const stage = c.stage; stage.innerHTML = '';
      const done = [['🍎', 'Buah'], ['🍜', 'Udon'], ['🍩', 'Donat'], ['🥟', 'Pempek Kulit']];
      const tough = [['🍛', 'Nasi Goreng'], ['🍳', 'Telur'], ['🍗', 'Ayam']];
      const hit = new Set();
      c.mission('Bangunkan 3 makanan tantangan', 3);
      const row1 = h('div', { class: 'card-grid c4' }, done.map(([e, n]) => h('div', { class: 'fcard' }, h('span', { class: 'em' }, e), n, h('small', {}, '✅ Iris jago!'))));
      const row2 = h('div', { class: 'card-grid c3' }, tough.map(([e, n]) => {
        const b = h('button', { class: 'fcard challenge', 'aria-label': n }, h('span', { class: 'em' }, e), n, h('small', {}, 'Ketuk aku!'));
        b.addEventListener('click', () => {
          play('sparkle'); b.classList.add('on'); $('small', b).textContent = '💪 Siap dikunyah!';
          if (!hit.has(n)) { hit.add(n); c.progress(hit.size); if (hit.size === 3) { princess('belle', 'Hebat! Nasi goreng, telur, dan ayam sudah bangun semua. Putri Iris pasti bisa!'); c.done(3); } else say(`${n} siap dikunyah bersama Mulan dan Belle!`); }
        });
        return b;
      }));
      stage.append(h('div', { class: 'cardstage' }, h('div', { class: 'row-label' }, '✅ Makanan yang Iris sudah jago mengunyahnya:'), row1, h('div', { class: 'row-label' }, '🏆 Tantangan baru yang siap Iris taklukkan:'), row2));
    }
  },
  {
    chapter: 'Bab 7 dari 7 · Janji Mahkota',
    title: 'Janji 4 Jurus Makan Hebat Putri Iris',
    text: 'Semua Princess bertepuk tangan untuk <strong>Putri Iris</strong>! Ingat 4 jurus Princess saat makan. Ketuk tiap jurus untuk berjanji!',
    speech: 'Semua Princess bertepuk tangan untuk Putri Iris! Ingat empat jurus Princess saat makan. Ketuk setiap jurus untuk berjanji!',
    mount(c) {
      const stage = c.stage; stage.innerHTML = '';
      const vows = [
        ['🥄', 'Pegang sendok sendiri', 'Satu, pegang sendok sendiri!'],
        ['👑', 'Duduk anggun & fokus', 'Dua, duduk anggun dan fokus, tanpa tolah-toleh!'],
        ['🦷', 'Giling di geraham belakang', 'Tiga, giling di geraham belakang bersama Mulan dan Belle!'],
        ['👠', 'Sudah halus, langsung telan!', 'Empat, kalau sudah halus langsung telan bersama Cinderella!']
      ];
      const ok = new Set();
      const final = h('div', { class: 'crown-final' }, '');
      c.mission('Ketuk 4 jurus untuk berjanji', 4);
      const grid = h('div', { class: 'card-grid c2' }, vows.map(([e, n, s], i) => {
        const b = h('button', { class: 'fcard challenge vow', 'aria-label': n }, h('span', { class: 'em' }, e), n);
        b.addEventListener('click', () => {
          b.classList.add('on'); play('sparkle'); say(s);
          if (!ok.has(i)) {
            ok.add(i); c.progress(ok.size);
            if (ok.size === 4) { later(() => { final.textContent = '👑 Mahkota Putri Iris menyala! 👑'; play('fanfare'); confetti(60); c.done(4); }, 1700); }
          }
        });
        return b;
      }));
      stage.append(h('div', { class: 'cardstage' }, grid, final));
    }
  }
];

const pageDone = [];
let pageIdx = 0;
let pageCtx = null;

function enterStory() { pageIdx = 0; renderPage(1); }
function unmountPage() { pageCtx = null; $('#storyStage').innerHTML = ''; $('#storyAct').innerHTML = ''; }

function renderPage(dir = 1) {
  hush(); clearTimers(); endCountdown();
  const p = PAGES[pageIdx];
  const body = $('#storyBody');
  body.classList.remove('turn', 'turn-back'); void body.offsetWidth; body.classList.add(dir < 0 ? 'turn-back' : 'turn');
  $('#chapterBadge').textContent = p.chapter;
  $('#storyTitle').textContent = p.title;
  $('#storyText').innerHTML = p.text;
  const stage = $('#storyStage'), act = $('#storyAct'), mission = $('#storyMission');
  stage.innerHTML = ''; act.innerHTML = '';
  let total = 0;
  const setMission = (text, tot) => {
    total = tot || 0;
    mission.className = 'mission';
    mission.innerHTML = '';
    mission.append(h('span', {}, '🎯'), h('span', {}, text));
    if (total) mission.append(h('span', { class: 'count' }, `0/${total}`));
  };
  const ctx = pageCtx = {
    stage,
    frame: (src, alt) => mountFrame(stage, src, alt),
    mission: setMission,
    progress: n => { const el = $('.count', mission); if (el) el.textContent = `${n}/${total}`; },
    act: items => items.forEach(it => {
      const b = h('button', { class: 'act-btn ' + it.cls, html: it.label });
      b.addEventListener('click', it.on); act.append(b); if (it.ref) it.ref(b);
    }),
    done: (stars = 2) => {
      if (pageCtx !== ctx) return;
      mission.classList.add('done');
      const t = mission.children[1]; if (t && !t.textContent.startsWith('✅')) t.textContent = '✅ Hebat! ' + t.textContent;
      if (!pageDone[pageIdx]) { pageDone[pageIdx] = true; addStars(stars); confetti(18); renderDots(); }
      $('#btnNext').classList.add('glow');
    }
  };
  setMission('');
  p.mount(ctx);
  renderDots();
  $('#btnPrev').disabled = pageIdx === 0;
  $('#nextLabel').textContent = pageIdx === PAGES.length - 1 ? 'Mulai Makan! 🍽️' : 'Lanjut';
  $('#btnNext').classList.toggle('glow', !!pageDone[pageIdx]);
  if (S.autoRead) later(() => say(p.speech), 500);
}

function renderDots() {
  const box = $('#storyDots'); box.innerHTML = '';
  PAGES.forEach((_, i) => {
    const d = h('button', { class: 'dot' + (i === pageIdx ? ' on' : '') + (pageDone[i] ? ' ok' : ''), 'aria-label': `Bab ${i + 1}` });
    d.addEventListener('click', () => { if (i !== pageIdx) { const dir = i > pageIdx ? 1 : -1; pageIdx = i; renderPage(dir); } });
    box.append(d);
  });
}
function nextPage() { if (pageIdx < PAGES.length - 1) { pageIdx++; renderPage(1); } else show('meal'); }
function prevPage() { if (pageIdx > 0) { pageIdx--; renderPage(-1); } }
$('#btnNext').addEventListener('click', nextPage);
$('#btnPrev').addEventListener('click', prevPage);
$('#btnRead').addEventListener('click', () => say(PAGES[pageIdx].speech));

/* geser kiri/kanan untuk ganti halaman */
(() => {
  let sx = 0, sy = 0, st = 0;
  const body = $('#storyBody');
  body.addEventListener('touchstart', e => { const t = e.changedTouches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive: true });
  body.addEventListener('touchend', e => {
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if (Date.now() - st < 700 && Math.abs(dx) > 70 && Math.abs(dy) < 45) (dx < 0 ? nextPage : prevPage)();
  }, { passive: true });
})();
document.addEventListener('keydown', e => {
  if (current !== 'story' || $('dialog[open]')) return;
  if (e.key === 'ArrowRight') nextPage();
  if (e.key === 'ArrowLeft') prevPage();
});

/* =========================================================
   TEMAN MAKAN
   ========================================================= */
const meal = { food: FOODS[0], phase: 'ready', chews: 0, target: 8, bolus: null, layer: null, frame: null, side: 0, auto: false, autoT: 0, t0: 0, tick: 0, busy: false, sides: {}, hotSlide: null, tag: null, softbar: null };

function enterMeal() {
  const stage = $('#mealStage');
  const { frame, layer } = mountFrame(stage, 'assets/palace.webp', 'Istana mulut Putri Iris');
  meal.frame = frame; meal.layer = layer; meal.busy = false; meal.auto = false; meal.chews = 0;
  meal.tag = h('div', { class: 'tag-pill' }, '');
  meal.softbar = h('div', { class: 'softbar' }, h('div', { class: 'softbar-label' }, 'Kelembutan: 0%'), h('div', { class: 'bar' }, h('i')));
  layer.append(meal.tag, meal.softbar);
  meal.sides.left = hot(layer, 19, 50, 21, 56, { onTap: () => chew('left'), pulse: false, label: 'Gigi geraham Mulan' });
  meal.sides.right = hot(layer, 88, 50, 21, 56, { onTap: () => chew('right'), pulse: false, label: 'Gigi geraham Belle' });
  meal.hotSlide = hot(layer, 62, 40, 16, 40, { onTap: () => { if (meal.phase === 'swallow') swallowNow(); }, pulse: false, label: 'Perosotan emas' });
  [['snow', 37, 36], ['mulan', 19, 67], ['belle', 88, 67], ['cinde', 74, 62]].forEach(([k, x, y], i) =>
    avatar(layer, k, x, y, { pulse: false, d: i * .3, onTap: () => { play('pop'); princess(k, GREET[k]); } }));
  meal.bolus = bolus(layer, meal.food.emoji);

  renderFoods();
  setPhase('ready');
  updateBites();
  updateTimer();
  clearInterval(meal.tick); meal.tick = setInterval(updateTimer, 1000);
}
function leaveMeal() {
  clearInterval(meal.tick); clearInterval(meal.autoT); meal.autoT = 0; meal.auto = false;
}

function renderFoods() {
  const row = $('#foodRow'); row.innerHTML = '';
  FOODS.forEach(f => {
    const b = h('button', { class: 'food' + (f === meal.food ? ' sel' : '') + (f.tough ? ' tough' : ''), role: 'radio', 'aria-checked': f === meal.food ? 'true' : 'false', 'aria-label': f.name },
      h('span', { class: 'em' }, f.emoji), h('span', {}, f.short || f.name));
    b.addEventListener('click', () => {
      if (meal.phase !== 'ready') { toast('🍽️', 'Tunggu sebentar', 'Selesaikan suapan ini dulu, lalu pilih makanan berikutnya ya!', false); return; }
      meal.food = f; play('pop'); renderFoods(); setPhase('ready');
    });
    row.append(b);
  });
}

function setPhase(p) {
  meal.phase = p;
  const card = $('#stepCard');
  card.className = 'step-card s-' + p;
  const acts = $('#stepActions'); acts.innerHTML = '';
  const art = (e) => { const a = $('#stepArt'); a.innerHTML = ''; a.append(h('span', {}, e)); };
  clearInterval(meal.autoT); meal.autoT = 0;
  Object.values(meal.sides).forEach(s => s.classList.toggle('pulse', p === 'chew'));
  meal.hotSlide.classList.toggle('pulse', p === 'swallow');
  meal.softbar.style.visibility = p === 'ready' ? 'hidden' : 'visible';

  if (p === 'ready') {
    $('#stepNum').textContent = '1';
    art(meal.food.emoji);
    $('#stepTitle').textContent = 'Iris suap sendiri!';
    $('#stepSub').textContent = meal.food.desc;
    meal.tag.textContent = `${meal.food.emoji} Langkah 1: suap sendiri pakai Sendok Sihir`;
    meal.bolus.reset(meal.food.emoji); meal.bolus.hide();
    const b = h('button', { class: 'big-btn gold glow' }, '🥄 Iris Suap Sendiri!');
    b.addEventListener('click', startBite);
    acts.append(b);
  }
  if (p === 'chew') {
    $('#stepNum').textContent = '2'; art('🦷');
    $('#stepSub').textContent = 'Oper ke geraham belakang, lalu kres-kres bersama Mulan & Belle!';
    meal.tag.textContent = '🦷 Langkah 2: giling di geraham belakang';
    const m = h('button', { class: 'act-btn mulan' }, h('span', {}, '🗡️ Mulan'), h('small', {}, 'Kres-kres!'));
    const bl = h('button', { class: 'act-btn belle' }, h('span', {}, '🌹 Belle'), h('small', {}, 'Giling halus!'));
    m.addEventListener('click', () => chew('left')); bl.addEventListener('click', () => chew('right'));
    const auto = h('label', { class: 'auto-toggle' }, h('input', { type: 'checkbox' }), 'Irama kunyah otomatis');
    $('input', auto).checked = meal.auto;
    $('input', auto).addEventListener('change', e => { meal.auto = e.target.checked; autoChew(); });
    acts.append(m, bl, auto);
    updateChewUI();
    autoChew();
  }
  if (p === 'swallow') {
    $('#stepNum').textContent = '3'; art('👠');
    $('#stepTitle').textContent = 'Sudah halus! Telan bersama Cinderella';
    $('#stepSub').textContent = 'Jangan disimpan di pipi. Ketuk tombol, lalu telan saat aba-aba “glek”!';
    meal.tag.textContent = '👠 Langkah 3: 1, 2, 3… glek!';
    const b = h('button', { class: 'big-btn purple glow' }, '👠 1, 2, 3… GLEK!');
    b.addEventListener('click', swallowNow);
    acts.append(b);
  }
}

function startBite() {
  if (meal.busy) return;
  if (!meal.t0) meal.t0 = Date.now();
  play('pop');
  meal.chews = 0; meal.target = meal.food.target; meal.side = 0;
  const b = meal.bolus; b.reset(meal.food.emoji);
  // dari sendok (mulut) → tengah → geraham
  b.to('mouth'); b.show(); b.bounce();
  later(() => { b.to('carpet'); play('chew'); }, 450);
  later(() => b.to('left'), 1000);
  $('.softbar-label', meal.softbar).textContent = 'Kelembutan: 0%'; $('.bar i', meal.softbar).style.width = '0%';
  setPhase('chew');
}

function updateChewUI() {
  const pct = Math.round(meal.chews / meal.target * 100);
  $('#stepTitle').textContent = `Giling di geraham · ${meal.chews}/${meal.target}`;
  $('.softbar-label', meal.softbar).textContent = `Kelembutan: ${pct}%`;
  $('.bar i', meal.softbar).style.width = pct + '%';
}

function chew(which) {
  if (meal.phase !== 'chew' || meal.busy) return;
  const el = meal.sides[which];
  play('chew'); meal.bolus.to(which); meal.bolus.bounce();
  el.classList.remove('chewing'); void el.offsetWidth; el.classList.add('chewing');
  floatText(meal.layer, 'Kres!', which === 'left' ? 19 : 88, 40);
  meal.chews++; updateChewUI();
  if (meal.chews >= meal.target) {
    meal.bolus.emoji('✨'); meal.bolus.soft(); play('sparkle');
    setPhase('swallow');
  }
}
function autoChew() {
  clearInterval(meal.autoT); meal.autoT = 0;
  if (!meal.auto || meal.phase !== 'chew') return;
  meal.autoT = setInterval(() => { meal.side ^= 1; chew(meal.side ? 'right' : 'left'); }, 1100);
}

async function swallowNow() {
  if (meal.phase !== 'swallow' || meal.busy) return;
  meal.busy = true;
  $('#stepActions').innerHTML = '';
  await swallowSequence(meal.bolus);
  bitesRec.n++; saveBites(); addStars(1); updateBites();
  const line = PRAISE[(bitesRec.n - 1) % PRAISE.length];
  play('bell'); toast('🌟', 'Suapan ke-' + bitesRec.n, line, true);
  meal.busy = false;
  if (bitesRec.n >= S.goal && !bitesRec.fin) { bitesRec.fin = 1; saveBites(); setPhase('ready'); later(finale, 900); return; }
  if (bitesRec.n % 5 === 0) confetti(20);
  setPhase('ready');
}

function updateBites() {
  const g = S.goal, n = bitesRec.n;
  $('#biteText').textContent = `${n} / ${g}`;
  $('#biteBar').style.width = Math.min(100, n / g * 100) + '%';
}
function updateTimer() {
  const s = meal.t0 ? Math.floor((Date.now() - meal.t0) / 1000) : 0;
  $('#mealTimer').textContent = `⏱ ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function finale() {
  addStars(5); play('fanfare'); confetti(70);
  $('#finaleText').textContent = `Putri Iris menghabiskan ${bitesRec.n} suapan hebat! Kamu dapat 5 bintang bonus.`;
  say(`Hore! Putri Iris menghabiskan ${bitesRec.n} suapan hebat! Semua Princess bertepuk tangan!`);
  const d = $('#finale'); if (!d.open) d.showModal();
}
$('#finaleMore').addEventListener('click', () => { hush(); $('#finale').close(); });
$('#finaleDone').addEventListener('click', () => {
  hush(); $('#finale').close();
  bitesRec = { d: localDay(), n: 0, fin: 0 }; saveBites(); meal.t0 = 0;
  show('home');
});

/* tombol panggilan Princess untuk orang tua */
$$('.cue').forEach(b => b.addEventListener('click', () => {
  const key = b.dataset.cue, [who, msg] = CUES[key];
  play(key === 'swallow' ? 'bell' : 'sparkle'); princess(who, msg);
  if (meal.frame) {
    const cls = key === 'posture' ? 'shake' : key === 'focus' ? 'dim' : '';
    if (cls) { meal.frame.classList.add(cls); later(() => meal.frame.classList.remove(cls), 1600); }
  }
}));

/* =========================================================
   BAR ATAS, PENGATURAN, PWA
   ========================================================= */
$('#goStory').addEventListener('click', () => { actx(); show('story'); });
$('#goMeal').addEventListener('click', () => { actx(); show('meal'); });
$('#btnHome').addEventListener('click', () => show('home'));

function syncSound() {
  $('#btnSound').textContent = S.sound ? '🔊' : '🔇';
  $('#setSound').checked = S.sound;
  if (!S.sound) hush();
}
$('#btnSound').addEventListener('click', () => { S.sound = !S.sound; store.set('sound', S.sound); syncSound(); });

const de = document.documentElement;
const reqFS = de.requestFullscreen || de.webkitRequestFullscreen;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (!reqFS || standalone) $('#btnFull').hidden = true;
$('#btnFull').addEventListener('click', async () => {
  const d = document;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); }
    else { await reqFS.call(de); try { await screen.orientation.lock('landscape'); } catch { /* tidak didukung */ } }
  } catch { /* ditolak */ }
});

/* panel orang tua: tahan 1 detik agar anak tidak terbuka tak sengaja */
(() => {
  const btn = $('#btnParent'), dlg = $('#parentDlg');
  let t = 0, opened = false;
  const open = () => { opened = true; $('#setGoal').value = String(S.goal); $('#setAutoRead').checked = S.autoRead; $('#setSound').checked = S.sound; if (!dlg.open) dlg.showModal(); };
  btn.addEventListener('pointerdown', () => { opened = false; clearTimeout(t); t = setTimeout(open, 900); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, () => clearTimeout(t)));
  btn.addEventListener('click', e => {
    if (e.detail === 0) return open();                       // dari keyboard
    if (!opened) toast('👪', 'Untuk orang tua', 'Tahan tombol ini selama 1 detik untuk membuka panduan & pengaturan.', false);
  });
  btn.addEventListener('contextmenu', e => e.preventDefault());
  $('#parentClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
})();

$('#setGoal').addEventListener('change', e => { S.goal = parseInt(e.target.value, 10) || 15; store.set('goal', S.goal); bitesRec.fin = bitesRec.n >= S.goal ? 1 : 0; saveBites(); updateBites(); });
$('#setAutoRead').addEventListener('change', e => { S.autoRead = e.target.checked; store.set('autoRead', S.autoRead); });
$('#setSound').addEventListener('change', e => { S.sound = e.target.checked; store.set('sound', S.sound); syncSound(); });
$('#setResetBites').addEventListener('click', () => { bitesRec = { d: localDay(), n: 0, fin: 0 }; saveBites(); meal.t0 = 0; updateBites(); updateTimer(); enterHome(); });
$('#setResetAll').addEventListener('click', () => { if (confirm('Reset semua bintang Iris menjadi 0?')) { S.stars = 0; store.set('stars', 0); updateStars(); enterHome(); } });

/* cegah zoom cubit (ketukan cepat tetap diterima: touch-action: manipulation) */
document.addEventListener('gesturestart', e => e.preventDefault());

/* ---------- mulai ---------- */
updateStars(); syncSound(); show('home');

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
})();
