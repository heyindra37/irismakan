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

/* pengaturan lama (versi tanpa rak buku) dibaca sebagai cadangan */
const legacy = k => { try { return localStorage.getItem(k); } catch { return null; } };
const S = {
  stars: store.get('stars', parseInt(legacy('iris_princess_stars'), 10) || 0),
  sound: store.get('sound', true),
  autoRead: store.get('autoRead', true),
  goal: store.get('goal', 15),
  pitch: store.get('pitch', parseFloat(legacy('iris_voice_pitch')) || 1.35),
  rate: store.get('rate', parseFloat(legacy('iris_voice_rate')) || 1.05),
  voiceURI: store.get('voiceURI', legacy('iris_voice_uri') || ''),
  chime: store.get('chime', legacy('iris_chime_only') === 'true')
};
let bitesRec = store.get('bites', null);
if (!bitesRec || bitesRec.d !== localDay()) bitesRec = { d: localDay(), n: 0, fin: 0 };
const saveBites = () => store.set('bites', bitesRec);

/* ---------- tokoh & data ---------- */
const P = {
  snow:  { emoji: '🍎', name: 'Snow White', role: 'Gerbang Depan',                color: '#e11d48' },
  mulan: { emoji: '🗡️', name: 'Mulan',      role: 'Komandan Geraham Kanan',       color: '#059669' },
  belle: { emoji: '🌹', name: 'Belle',      role: 'Penjaga Sensor Bubur Bintang', color: '#d97706' },
  cinde: { emoji: '👠', name: 'Cinderella', role: 'Penjaga Lidah & Perosotan',    color: '#0284c7' }
};

const FOODS = [
  { id: 'nasigoreng', name: 'Nasi Goreng', short: 'N. Goreng', emoji: '🍛', tough: true,  target: 8, desc: 'Jangan parkir di lidah Cinderella! Langsung oper ke geraham Mulan & Belle sampai jadi Bubur Bintang!' },
  { id: 'ayam',       name: 'Ayam',        emoji: '🍗', tough: true,  target: 8, desc: 'Ayam gurih! Oper dari lidah Cinderella ke geraham belakang, kunyah cepat sampai tidak ada yang keras!' },
  { id: 'telur',      name: 'Telur',       emoji: '🍳', tough: true,  target: 6, desc: 'Telur lezat! Kunyah sigap di geraham sampai licin seperti Bubur Bintang lalu langsung GLEK!' },
  { id: 'buah',       name: 'Buah',        emoji: '🍎', tough: false, target: 6, desc: 'Buah segar! Begitu sudah berair dan lembut di geraham, langsung telan tanpa diemut!' },
  { id: 'udon',       name: 'Udon',        emoji: '🍜', tough: false, target: 6, desc: 'Udon lembut kesukaan Iris! Giling cepat di Mulan & Belle lalu luncurkan bersama Cinderella!' },
  { id: 'donat',      name: 'Donat',       emoji: '🍩', tough: false, target: 6, desc: 'Donat empuk! Kunyah dengan ketukan ceria sampai halus seperti krim kue!' },
  { id: 'pempek',     name: 'Pempek',      emoji: '🥟', tough: false, target: 7, desc: 'Hebat! Pempek kulit saja Iris bisa giling halus, apalagi nasi goreng dan ayam!' }
];

const GREET = {
  snow:  'Halo Putri Iris cantik! Aku senang sekali melihat Iris duduk anggun dan memegang sendok sendiri!',
  mulan: 'Halo Putri Iris hebat! Supaya makannya tidak lama, kita kunyah pakai irama cepat yuk: kres satu, kres dua, kres tiga, kres empat!',
  belle: 'Hai Putri Iris pintar! Kalau makanannya sudah tidak ada yang keras dan terasa licin seperti Bubur Bintang, jangan diemut lagi ya, langsung telan!',
  cinde: 'Hai Putri Iris! Ingat ya, aku di lidah tidak punya gigi dan tidak mau mengunyah! Jangan tahan makanan di lidahku, langsung oper ke geraham Mulan dan Belle ya!'
};

/* tombol panggilan cepat untuk orang tua: [avatar, judul, pesan] */
const CUES = {
  tongue: ['👠', 'Panggilan Cinderella di Lidah!', 'Eh Putri Iris sayang! Aku Cinderella di lidah tidak punya gigi dan tidak mau mengunyah lho! Jangan parkir makanannya di lidahku ya, ayo langsung oper ke gigi geraham Mulan dan Belle!'],
  speed:  ['🎵', 'Komando Kunyah Cepat Mulan & Belle!', 'Ayo Putri Iris, jangan berhenti-berhenti mengunyahnya! Ikuti ketukan cepat Mulan dan Belle yuk: kres satu, kres dua, kres tiga, kres empat, kres lima, sampai halus!'],
  smooth: ['🥣', 'Ting-Ting! Sensor Bubur Bintang!', 'Putri Iris coba rasakan: makanannya sudah tidak ada yang keras dan sudah licin seperti Bubur Bintang kan? Berarti sudah halus! Jangan diemut lagi ya, langsung satu, dua, tiga, glek!'],
  focus:  ['🍎', 'Tok-Tok! Pesan dari Snow White', 'Putri Iris sayang, jangan melamun dulu ya! Mulan dan Belle menunggu gerakan gigi geraham Iris supaya makannya cepat selesai!'],
  posture:['👑', 'Ups! Lantai Istana Mulut Goyang!', 'Kalau Putri Iris tolah-toleh atau ngulet saat makan, lantai istana ikut goyang! Yuk duduk anggun menghadap piring!'],
  spoon:  ['🥄', 'Tongkat Sihir Sendok Putri Iris', 'Mana tangan cantik Putri Iris yang memegang Sendok Sihir sendiri? Yuk pegang Sendok Sihir sendiri!']
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

/* Suara narator (Web Speech API). Memprioritaskan suara perempuan berbahasa Indonesia. */
const hasSpeech = 'speechSynthesis' in window;
let allVoices = [];
function scoreVoice(v) {
  const name = (v.name || '').toLowerCase(), uri = (v.voiceURI || '').toLowerCase(), lang = (v.lang || '').toLowerCase();
  const combined = name + ' ' + uri;
  let score = 0;
  if (/^id([-_]|$)/.test(lang) || combined.includes('indonesia')) score += 500;
  else if (/^ms([-_]|$)/.test(lang) || combined.includes('malay') || combined.includes('melayu')) score += 350;
  else return -9999;
  ['gadis', 'damayanti', 'female', 'perempuan', 'wanita', 'putri', 'siti', 'yasmin', 'hana', 'kartika', 'sari', 'dewi', 'noor', 'amira',
   '#female', 'female_1', 'female_2', 'female_3', 'wavenet-a', 'wavenet-d', 'standard-a', 'standard-d', 'siri_female', 'natural']
    .forEach(m => { if (combined.includes(m)) score += 150; });
  ['ardi', 'laki', 'pria', 'budi', 'putra', 'rizky', 'andi', 'male_1', 'male_2', 'male_3', 'wavenet-b', 'wavenet-c', 'standard-b', 'standard-c', 'siri_male']
    .forEach(m => { if (combined.includes(m)) score -= 600; });
  if (/\bmale\b|#male/.test(combined) && !combined.includes('female')) score -= 600;
  return score;
}
const rankedVoices = () => allVoices.map(v => ({ voice: v, score: scoreVoice(v) })).filter(x => x.score > -9000).sort((a, b) => b.score - a.score);
function currentVoice() {
  const r = rankedVoices();
  return (r.find(x => x.voice.voiceURI === S.voiceURI && x.score >= 0) || r[0] || {}).voice || null;
}
function loadVoices() {
  if (!hasSpeech) return;
  allVoices = speechSynthesis.getVoices() || [];
  const sel = $('#voiceSelect'), hint = $('#voiceHint'), r = rankedVoices();
  sel.innerHTML = '';
  if (!allVoices.length) { hint.textContent = 'Belum ada suara terdeteksi di perangkat ini.'; return; }
  if (!r.length) { hint.textContent = 'Tidak ada suara Indonesia di perangkat ini. Aktifkan "Mode Lonceng Musik Saja" bila suaranya tidak cocok.'; return; }
  r.forEach(x => sel.append(h('option', { value: x.voice.voiceURI }, `${x.score >= 600 ? '🌸 Perempuan' : x.score < 0 ? '⚠️ Laki-laki (dihindari)' : '✨ Indonesia'} — ${x.voice.name}`)));
  const v = currentVoice(); S.voiceURI = v ? v.voiceURI : '';
  sel.value = S.voiceURI; hint.textContent = `Aktif: ${v ? v.name : '-'} (nada ${S.pitch})`;
}
if (hasSpeech) { loadVoices(); try { speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch { /* abaikan */ } }
function say(text) {
  if (!S.sound || S.chime || !hasSpeech || !text) return;
  try {
    speechSynthesis.cancel();
    const v = currentVoice();
    (text.match(/[^.!?]+[.!?]*/g) || [text]).map(s => s.trim()).filter(Boolean).forEach(part => {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = (v && v.lang) || 'id-ID'; if (v) u.voice = v; u.rate = S.rate; u.pitch = S.pitch;
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
    chapter: 'Bab 1 dari 10 · Istana Mulut Level 2',
    title: 'Selamat Datang Kembali, Putri Iris yang Sudah Pintar Mengunyah!',
    text: 'Hore! <strong>Snow White, Mulan, Belle, dan Cinderella</strong> bertepuk tangan! Hari ini ada <strong>3 Jurus Rahasia Baru</strong> supaya makan Iris makin cepat, tidak capek, dan bisa segera bermain lagi!',
    speech: 'Hore! Selamat datang kembali Putri Iris cantik! Para Princess bangga sekali karena Iris sudah belajar mengunyah! Yuk kita buka tiga jurus rahasia baru supaya makan Iris makin cepat dan seru!',
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
    chapter: 'Bab 2 dari 10 · Tongkat Sihir Sendok',
    title: 'Jurus 1: Tangan Cantik Putri Iris Memegang Sendok Sendiri',
    text: '<strong>Snow White</strong> melambaikan tangan: “Putri Iris sebentar lagi ulang tahun ke-5, sudah besar! Tangan Iris hebat memegang <strong>Tongkat Sihir Sendok</strong> sendiri!” Saat Iris menyuap sendiri, gerbang istana terbuka lebar.',
    speech: 'Snow White berkata dengan ceria: Putri Iris sebentar lagi berusia lima tahun! Yuk pegang Tongkat Sihir Sendok dengan tangan cantik Iris sendiri!',
    mount(c) {
      const { layer } = c.frame('assets/hero.webp', 'Putri Iris memegang sendok emas');
      let n = 0;
      const foods = [{ e: '🍛', from: [51, 75] }, { e: '🍳', from: [51, 70] }, { e: '🍗', from: [38, 88] }];
      const lines = ['Hebat sekali! Itu suapan mandiri pertama! Sekarang langsung oper dari lidah ke geraham ya!', 'Dua! Lampu kristal istana makin terang!', 'Tiga! Tangan cantik Putri Iris pintar sekali menyuap sendiri!'];
      c.mission('Ketuk sendok emas, suap sendiri 3 kali', 3);
      const spoon = () => {
        const f = foods[n % 3];
        fly(layer, f.e, f.from, POS.mouth); play('pop');
        later(() => play('chew'), 700);
        princess('snow', lines[Math.min(n, 2)]);
        n++; c.progress(Math.min(n, 3)); if (n === 3) c.done(3);
      };
      hot(layer, 64, 41, 14, 30, { onTap: spoon, label: 'Sendok emas' });
      c.act([{ cls: 'snow', label: '🥄 Suap Sendiri!', on: spoon }]);
    }
  },
  {
    chapter: 'Bab 3 dari 10 · Duduk Anggun & Fokus',
    title: 'Jangan Goyang Istana! Duduk Tegap Tanpa Tolah-Toleh',
    text: 'Kalau Iris <strong>tolah-toleh</strong>, <strong>ngulet</strong>, atau <strong>bengong</strong>, lantai istana bergoyang dan lampunya meredup! Kalau Putri Iris duduk anggun menghadap piring, semua Princess bisa bekerja cepat sehingga makan Iris cepat selesai!',
    speech: 'Kalau Putri Iris duduk anggun dan fokus menghadap piring tanpa tolah-toleh atau bengong, semua Princess bisa bekerja super cepat!',
    mount(c) {
      const { frame, layer } = c.frame('assets/hero.webp', 'Putri Iris duduk di kursi istana');
      const note = h('div', { class: 'tag-pill' }, '👑 Putri Iris duduk anggun!');
      layer.append(note);
      c.mission('Coba semuanya, lalu pilih Duduk Anggun');
      const modes = {
        wiggle:   { cls: 'shake', pill: '😵‍💫 Istana goyang, makanan susah dioper!', who: 'mulan', msg: 'Aduh, lantai istana goyang! Makanan jadi susah dioper ke geraham Mulan dan Belle!', snd: 'wobble' },
        daydream: { cls: 'dim',   pill: '😴 Melamun: kunyahan berhenti, makan lama…',  who: 'belle', msg: 'Lho, lampunya redup. Kalau melamun, mengunyahnya berhenti dan makannya jadi lama sekali!', snd: 'wobble' },
        graceful: { cls: '',      pill: '👑 Putri Iris duduk anggun & fokus!',         who: 'snow',  msg: 'Pintar! Duduk anggun dan fokus membuat makan Putri Iris cepat selesai!', snd: 'sparkle' }
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
    chapter: 'Bab 4 dari 10 · Aturan Baru Lidah Cinderella ✨',
    title: 'Cinderella di Lidah Tidak Mau Mengunyah! Jangan Parkir di Lidah!',
    text: 'Makanan yang baru masuk mendarat sebentar di <strong>Karpet Lidah Cinderella</strong>. Tapi <strong>Cinderella TIDAK punya gigi dan TIDAK mau mengunyah!</strong> Begitu makanan masuk, langsung lempar ke geraham Mulan dan Belle!',
    speech: 'Cinderella berkata: Eh Putri Iris sayang! Aku di lidah tidak punya gigi dan tidak mau mengunyah! Kalau makanannya ditahan di lidahku, gaun pestaku jadi berat! Ayo langsung lempar makanannya ke gigi geraham Mulan dan Belle!',
    mount(c) {
      const { layer } = c.frame('assets/palace.webp', 'Makanan di karpet lidah Cinderella');
      const b = bolus(layer, '🍗'); b.show(); b.el.classList.add('alert');
      const tag = h('div', { class: 'tag-pill' }, '🚫 Cinderella: “Aku nggak mau ngunyah!”');
      layer.append(tag);
      c.mission('Bantu Cinderella oper makanan ke geraham', 1);
      let relayed = false;
      const relay = side => {
        if (relayed) return; relayed = true;
        b.el.classList.remove('alert'); b.to(side); b.bounce(); play('sparkle');
        tag.textContent = '✅ Lidah Cinderella bersih & lega!';
        princess('cinde', 'Tring! Begitu dong! Begitu makanan menyentuh lidah, langsung diserahkan ke gigi geraham Mulan dan Belle! Terima kasih Putri Iris!');
        c.progress(1); c.done(3);
      };
      const hold = () => {
        relayed = false; b.el.classList.add('alert'); b.to('carpet'); b.bounce(); play('wobble');
        tag.textContent = '🚫 Cinderella: “Aku nggak mau ngunyah!”';
        princess('cinde', 'Aduh Putri Iris! Jangan tahan makanannya di lidahku ya! Aku Cinderella tidak punya gigi dan tidak mau mengunyah! Ayo serahkan ke geraham Mulan dan Belle!');
      };
      hot(layer, 19, 50, 21, 56, { onTap: () => relay('left'), label: 'Oper ke geraham Mulan' });
      hot(layer, 88, 50, 21, 56, { onTap: () => relay('right'), label: 'Oper ke geraham Belle' });
      avatar(layer, 'mulan', 19, 67, { pulse: false, onTap: () => relay('left') });
      avatar(layer, 'belle', 88, 67, { pulse: false, onTap: () => relay('right') });
      avatar(layer, 'cinde', 74, 62, { pulse: false, d: .2, onTap: () => { play('pop'); princess('cinde', GREET.cinde); } });
      c.act([
        { cls: 'slate', label: '😣 Kalau Ditahan di Lidah', on: hold },
        { cls: 'cinde', label: '👠➡️🦷 Oper Cepat ke Geraham!', on: () => relay(Math.random() < .5 ? 'left' : 'right') }
      ]);
    }
  },
  {
    chapter: 'Bab 5 dari 10 · Oper ke Geraham Belakang',
    title: 'Mulan & Belle yang Punya Gigi Kuat untuk Mengunyah!',
    text: 'Yang mengunyah bukan Cinderella, tapi <strong>Mulan di Gigi Geraham Kanan</strong> dan <strong>Belle di Gigi Geraham Kiri</strong>! Begitu makanan dioper, mereka bersorak: “Biar kami yang menggiling dengan gigi geraham yang kuat!”',
    speech: 'Bukan lidah Cinderella yang mengunyah, tapi Gigi Geraham Mulan di kanan dan Gigi Geraham Belle di kiri! Yuk oper makanannya ke pojok belakang!',
    mount(c) {
      const { layer } = c.frame('assets/palace.webp', 'Dua tahta gigi geraham');
      const T = 6; let n = 0;
      const b = bolus(layer, '🍗'); b.show();
      const bar = h('div', { class: 'softbar' }, h('div', { class: 'softbar-label' }, 'Kelembutan: 0%'), h('div', { class: 'bar' }, h('i')));
      layer.append(bar);
      c.mission('Giling 6 kali, kiri dan kanan bergantian', T);
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
          princess(which === 'left' ? 'mulan' : 'belle', 'Hebat! Gigi geraham Mulan dan Belle memang juara menggiling makanan!');
          c.done(2);
        }
      };
      sides.left = hot(layer, 19, 50, 21, 56, { onTap: () => chew('left'), label: 'Gigi geraham Mulan' });
      sides.right = hot(layer, 88, 50, 21, 56, { onTap: () => chew('right'), label: 'Gigi geraham Belle' });
      avatar(layer, 'mulan', 19, 67, { pulse: false, onTap: () => chew('left') });
      avatar(layer, 'belle', 88, 67, { pulse: false, onTap: () => chew('right') });
      c.act([
        { cls: 'mulan', label: '🗡️ Geraham Kanan<br>(Mulan)', on: () => chew('left') },
        { cls: 'belle', label: '🌹 Geraham Kiri<br>(Belle)', on: () => chew('right') }
      ]);
    }
  },
  {
    chapter: 'Bab 6 dari 10 · Ketukan Musik Kres-Kres Cepat ✨',
    title: 'Jurus 2: Ikuti Irama Musik Kres-Kres Cepat!',
    text: 'Makan Iris kadang lama karena mengunyahnya berhenti-berhenti. Sekarang Mulan dan Belle menyalakan <strong>Musik Ketukan Cepat</strong>! Gerakkan geraham tanpa berhenti: <em>Kres-Satu! Kres-Dua!</em> … sampai <em>Kres-Delapan!</em>',
    speech: 'Supaya makannya cepat selesai, jangan berhenti-berhenti saat mengunyah ya! Ayo ikuti irama musik Mulan dan Belle: Kres satu, kres dua, kres tiga, kres empat, sampai delapan kali!',
    mount(c) {
      const stage = c.stage; stage.innerHTML = '';
      let hits = 0, running = false;
      const squares = [...Array(8)].map((_, i) => h('div', { class: 'beat' }, String(i + 1)));
      const status = h('div', { class: 'crown-final' }, 'Ketukan kunyah cepat: 0 / 8');
      const show8 = () => {
        squares.forEach((s, i) => { const on = hits > i; s.classList.toggle('on', on); s.textContent = on ? '⭐' : String(i + 1); });
        status.textContent = hits >= 8 ? '🎉 Hebat! 8 ketukan kunyah cepat tanpa berhenti!' : `Ketukan kunyah cepat: ${hits} / 8 (Kres-${hits + 1}!)`;
        c.progress(hits);
      };
      const finish = () => { play('sparkle'); princess('mulan', 'Wah cepat sekali! Kalau Putri Iris mengunyah mengikuti ketukan 1 sampai 8 seperti ini, makannya pasti cepat selesai!'); c.done(3); };
      const tap = () => { if (running) return; hits = (hits % 8) + 1; play('beat'); show8(); if (hits === 8) finish(); };
      const auto = () => {
        if (running) return; running = true; hits = 0; show8();
        say('Ayo ikut mengunyah cepat bersama Mulan dan Belle! Kres satu, dua, tiga, empat, lima, enam, tujuh, delapan! Halus deh!');
        const step = () => { hits++; play('beat'); show8(); if (hits >= 8) { running = false; finish(); } else later(step, 650); };
        later(step, 400);
      };
      c.mission('Ketuk kunyah cepat sampai 8 ketukan', 8);
      stage.append(h('div', { class: 'cardstage' },
        h('div', { class: 'row-label' }, '🎵⚡ Metronom Musik Kunyah Cepat Mulan & Belle'),
        h('div', { class: 'beats' }, squares), status,
        h('div', { class: 'row-label' }, 'Gerakkan rahang mengikuti hitungan 1 sampai 8, tanpa jeda bengong ya!')));
      c.act([
        { cls: 'mulan', label: '🎵 Mainkan 8 Ketukan!', on: auto },
        { cls: 'belle', label: '🦷 Ketuk Kunyah Cepat (+1)', on: tap }
      ]);
    }
  },
  {
    chapter: 'Bab 7 dari 10 · Sensor Bubur Bintang ✨',
    title: 'Jurus 3: Cek Sensor Bubur Bintang! Sudah Halus Belum?',
    text: 'Belle punya <strong>3 tanda</strong> makanan siap ditelan:<br>1️⃣ <strong>Tidak ada yang keras</strong> lagi.<br>2️⃣ Rasanya <strong>licin dan menyatu</strong> seperti Bubur Bintang atau es krim leleh.<br>3️⃣ Sudah <strong>8 kunyahan cepat</strong>. Kalau begitu, <strong>STOP EMUT!</strong>',
    speech: 'Bagaimana cara tahu makanan di mulut Iris sudah halus? Coba rasakan! Kalau sudah tidak ada yang keras, dan rasanya sudah licin lembut menyatu seperti Bubur Bintang atau es krim leleh, itu tandanya sudah halus! Jangan diemut lagi ya!',
    mount(c) {
      const stage = c.stage; stage.innerHTML = '';
      const info = [
        ['🍗🧱', '1. Masih Utuh', 'Keras! Oper ke geraham', 'tex1', 'Tahap satu: Makanannya masih utuh dan keras. Jangan ditahan di lidah ya, langsung oper ke geraham!'],
        ['🥘🦷', '2. Setengah Halus', 'Masih kriuk. Kunyah lagi!', 'tex2', 'Tahap dua: Makanannya mulai lumat digiling Mulan dan Belle. Ayo kunyah sedikit lagi!'],
        ['✨🥣✨', '3. Bubur Bintang!', 'Licin! STOP EMUT, TELAN!', 'tex3', '']
      ];
      const status = h('div', { class: 'crown-final' }, 'Ketuk tiap tahap untuk merasakan bedanya');
      c.mission('Ketuk 3 tahap sampai Bubur Bintang', 3);
      const seen = new Set();
      const cards = info.map(([e, t, s, cls, sp], i) => {
        const b = h('button', { class: 'fcard challenge ' + cls }, h('span', { class: 'em' }, e), t, h('small', {}, s));
        b.addEventListener('click', () => {
          cards.forEach(x => x.classList.remove('sel')); b.classList.add('sel');
          seen.add(i); c.progress(seen.size);
          if (i === 2) {
            play('bell');
            status.textContent = '🌟 LULUS SENSOR! Licin seperti Bubur Bintang: jangan diemut, langsung GLEK!';
            princess('belle', 'Nah, begini rasanya kalau sudah halus: sudah tidak ada yang keras, dan terasa licin lembut seperti Bubur Bintang! Kalau sudah begini, jangan diemut lagi ya, langsung telan!');
            c.done(3);
          } else { play('pop'); status.textContent = sp.split(': ')[1] || sp; say(sp); }
        });
        return b;
      });
      stage.append(h('div', { class: 'cardstage' },
        h('div', { class: 'row-label' }, '🔍 Sensor Tekstur Belle: ketuk untuk lihat bedanya!'),
        h('div', { class: 'card-grid c3 tall' }, cards), status));
    }
  },
  {
    chapter: 'Bab 8 dari 10 · Lonceng Perosotan Cinderella',
    title: 'Sudah Bubur Bintang? Jangan Diemut, Langsung 1, 2, 3… GLEK!',
    text: 'Begitu makanan jadi <strong>Bubur Bintang yang lembut dan licin</strong>, lonceng Cinderella berbunyi: <em>TING-TING-TING!</em> “Kalau sudah halus, jangan diemut atau ditahan lagi ya! Satu, dua, tiga… GLEK! Meluncur ke perut!”',
    speech: 'Ting ting ting! Lonceng Cinderella berbunyi! Kalau makanannya sudah lembut seperti Bubur Bintang, jangan diemut lagi! Ayo satu, dua, tiga, glek! Langsung telan meluncur ke perut!',
    mount(c) {
      const { layer } = c.frame('assets/palace.webp', 'Perosotan emas Cinderella');
      const b = bolus(layer, '🥣'); b.soft(); b.show();
      let busy = false;
      c.mission('Ketuk Perosotan Emas atau tombol GLEK!');
      const go = async () => {
        if (busy) return; busy = true;
        await swallowSequence(b);
        play('bell'); princess('cinde', 'Satu, dua, tiga, glek! Pintar sekali tidak diemut lagi! Bubur Bintang langsung meluncur ke perut!');
        c.done(2);
        await wait(1200); b.reset('🥣'); b.soft(); b.show(); busy = false;
      };
      hot(layer, 62, 40, 16, 40, { onTap: go, label: 'Perosotan emas' });
      avatar(layer, 'cinde', 76, 64, { onTap: go, d: .2 });
      c.act([{ cls: 'cinde', label: '👠 Sudah Halus! 1, 2, 3… GLEK!', on: go }]);
    }
  },
  {
    chapter: 'Bab 9 dari 10 · Tantangan Menu Juara Iris',
    title: 'Taklukkan Nasi Goreng, Ayam & Telur dengan Cepat!',
    text: 'Iris sudah jago <strong>Buah, Udon, Donat, dan Pempek Kulit</strong>. Dengan jurus <strong>Oper dari Lidah → Kunyah Cepat 8 Ketukan → Cek Bubur Bintang → Langsung Glek</strong>, menu apa pun jadi cepat habis!',
    speech: 'Dengan jurus oper dari lidah Cinderella, kunyah cepat delapan ketukan, dan sensor Bubur Bintang, Putri Iris pasti bisa menghabiskan nasi goreng, daging ayam, dan telur dengan cepat!',
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
          play('sparkle'); b.classList.add('on'); $('small', b).textContent = '⭐ Siap cepat!';
          if (!hit.has(n)) { hit.add(n); c.progress(hit.size); if (hit.size === 3) { princess('belle', 'Hore! Oper dari lidah Cinderella ke geraham, kunyah delapan ketukan cepat, dan begitu jadi Bubur Bintang langsung glek!'); c.done(3); } else say(`${n} siap dijadikan Bubur Bintang bersama Mulan dan Belle!`); }
        });
        return b;
      }));
      stage.append(h('div', { class: 'cardstage' }, h('div', { class: 'row-label' }, '✅ Makanan yang Iris sudah jago:'), row1, h('div', { class: 'row-label' }, '🏆 Menu yang siap diubah jadi Bubur Bintang cepat:'), row2));
    }
  },
  {
    chapter: 'Bab 10 dari 10 · Mahkota Kecepatan Putri Iris',
    title: 'Janji Baru Putri Iris: Tidak Tahan di Lidah & Tidak Diemut Lama!',
    text: 'Selamat <strong>Putri Iris</strong>! Sekarang Iris naik ke <strong>Level 2 Kerajaan Princess</strong>! Ketuk tiap janji cepat untuk menerima <strong>Sertifikat Putri Kunyah Sigap &amp; Telan Tepat Waktu</strong>.',
    speech: 'Selamat Putri Iris sayang! Ingat janji kita hari ini: Satu, jangan tahan makanan di lidah Cinderella, langsung oper ke geraham! Dua, kunyah dengan ketukan cepat Mulan dan Belle! Tiga, kalau sudah lembut licin seperti Bubur Bintang, jangan diemut lagi, langsung satu, dua, tiga, glek!',
    mount(c) {
      const stage = c.stage; stage.innerHTML = '';
      const vows = [
        ['👠', 'Cinderella tidak mau mengunyah: oper ke geraham!', 'Satu, jangan tahan makanan di lidah Cinderella, langsung oper ke geraham!'],
        ['🎵', 'Kunyah ikut ketukan cepat Mulan & Belle', 'Dua, kunyah dengan ketukan cepat Mulan dan Belle, tanpa melamun!'],
        ['🥣', 'Licin seperti Bubur Bintang? STOP EMUT, GLEK!', 'Tiga, kalau sudah lembut licin seperti Bubur Bintang, jangan diemut lagi, langsung satu, dua, tiga, glek!']
      ];
      const ok = new Set();
      const final = h('div', { class: 'crown-final' }, '');
      c.mission('Ketuk 3 janji cepat', 3);
      const grid = h('div', { class: 'card-grid c3 tall' }, vows.map(([e, n, s], i) => {
        const b = h('button', { class: 'fcard challenge vow', 'aria-label': n }, h('span', { class: 'em' }, e), n);
        b.addEventListener('click', () => {
          b.classList.add('on'); play('sparkle'); say(s);
          if (!ok.has(i)) {
            ok.add(i); c.progress(ok.size);
            if (ok.size === 3) later(() => { final.textContent = '👑 Sertifikat Level 2 untuk Putri Iris! 👑'; play('fanfare'); confetti(60); c.done(4); }, 1700);
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
   alur: suap sendiri → (lidah Cinderella) oper ke geraham → kunyah cepat → sensor Bubur Bintang → telan
   ========================================================= */
const meal = { food: FOODS[0], phase: 'ready', chews: 0, target: 8, bolus: null, layer: null, frame: null, side: 0, auto: false, autoT: 0, t0: 0, biteAt: 0, phaseAt: 0, warned: false, tick: 0, busy: false, sides: {}, hotSlide: null, tag: null, softbar: null };

function enterMeal() {
  const stage = $('#mealStage');
  const { frame, layer } = mountFrame(stage, 'assets/palace.webp', 'Istana mulut Putri Iris');
  meal.frame = frame; meal.layer = layer; meal.busy = false; meal.auto = false; meal.chews = 0;
  meal.tag = h('div', { class: 'tag-pill' }, '');
  meal.softbar = h('div', { class: 'softbar' }, h('div', { class: 'softbar-label' }, ''), h('div', { class: 'bar' }, h('i')));
  layer.append(meal.tag, meal.softbar);
  hot(layer, 52, 78, 34, 22, { pulse: false, label: 'Karpet lidah Cinderella', onTap: () => {
    if (meal.phase === 'tongue') relay(meal.side ? 'right' : 'left');
    else princess('cinde', 'Ingat ya Putri Iris, aku di lidah tidak mau mengunyah! Tugasku cuma mengoper makanan ke geraham Mulan dan Belle!');
  } });
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
  meal.phase = p; meal.phaseAt = Date.now(); meal.warned = false;
  const card = $('#stepCard');
  card.className = 'step-card s-' + p;
  const acts = $('#stepActions'); acts.innerHTML = '';
  const art = e => { const a = $('#stepArt'); a.innerHTML = ''; a.append(h('span', {}, e)); };
  clearInterval(meal.autoT); meal.autoT = 0;
  Object.values(meal.sides).forEach(s => s.classList.toggle('pulse', p === 'tongue' || p === 'chew'));
  meal.hotSlide.classList.toggle('pulse', p === 'swallow');
  meal.softbar.style.visibility = p === 'ready' || p === 'tongue' ? 'hidden' : 'visible';

  if (p === 'ready') {
    $('#stepNum').textContent = '1A'; art(meal.food.emoji);
    $('#stepTitle').textContent = 'Iris suap sendiri!';
    $('#stepSub').textContent = meal.food.desc;
    meal.tag.textContent = `${meal.food.emoji} Langkah 1: suap sendiri pakai Sendok Sihir`;
    meal.bolus.reset(meal.food.emoji); meal.bolus.hide();
    const b = h('button', { class: 'big-btn gold glow' }, '🥄 Iris Suap Sendiri!');
    b.addEventListener('click', startBite);
    acts.append(b);
  }
  if (p === 'tongue') {
    $('#stepNum').textContent = '1B'; art('👠');
    $('#stepTitle').textContent = 'Jangan parkir di lidah Cinderella!';
    $('#stepSub').textContent = '👠 Di lidah 0 dtk. Ayo oper ke geraham Mulan & Belle!';
    meal.tag.textContent = '🚫 Cinderella di lidah tidak mau mengunyah!';
    const b = h('button', { class: 'big-btn sky glow' }, '👠➡️🦷 Oper dari Lidah ke Geraham!');
    b.addEventListener('click', () => relay(meal.side ? 'right' : 'left'));
    acts.append(b);
  }
  if (p === 'chew') {
    $('#stepNum').textContent = '2'; art('🦷');
    $('#stepSub').textContent = 'Kunyah cepat tanpa berhenti bersama Mulan & Belle: kres-kres!';
    meal.tag.textContent = '🦷 Langkah 2: giling cepat di geraham belakang';
    const m = h('button', { class: 'act-btn mulan' }, h('span', {}, '🗡️ Mulan'), h('small', {}, 'Kres cepat!'));
    const bl = h('button', { class: 'act-btn belle' }, h('span', {}, '🌹 Belle'), h('small', {}, 'Giling halus!'));
    m.addEventListener('click', () => chew('left')); bl.addEventListener('click', () => chew('right'));
    const auto = h('label', { class: 'auto-toggle' }, h('input', { type: 'checkbox' }), '🎵 Ketukan cepat otomatis');
    $('input', auto).checked = meal.auto;
    $('input', auto).addEventListener('change', e => { meal.auto = e.target.checked; autoChew(); });
    acts.append(m, bl, auto);
    updateChewUI();
    autoChew();
  }
  if (p === 'swallow') {
    $('#stepNum').textContent = '3'; art('🥣');
    $('#stepTitle').textContent = 'TING-TING! Sudah jadi Bubur Bintang!';
    $('#stepSub').textContent = '🥣 Sudah halus 0 dtk! Jangan diemut, ayo GLEK!';
    meal.tag.textContent = '🥣 Langkah 3: licin? STOP EMUT, 1, 2, 3… glek!';
    const b = h('button', { class: 'big-btn purple glow' }, '👠 1, 2, 3… GLEK!');
    b.addEventListener('click', swallowNow);
    acts.append(b);
  }
}

function startBite() {
  if (meal.busy) return;
  const now = Date.now();
  if (!meal.t0) meal.t0 = now;
  meal.biteAt = now; meal.chews = 0; meal.target = meal.food.target; meal.side = 0;
  play('sparkle'); addStars(1);
  const b = meal.bolus; b.reset(meal.food.emoji);
  b.to('mouth'); b.show(); b.bounce();
  later(() => { b.to('carpet'); b.el.classList.add('alert'); play('wobble'); }, 450);
  setPhase('tongue');
  updateTimer();
}

/* Cinderella mengoper makanan dari lidah ke geraham */
function relay(side) {
  if (meal.phase !== 'tongue' || meal.busy) return;
  meal.bolus.el.classList.remove('alert');
  meal.bolus.to(side); meal.bolus.bounce();
  meal.side = side === 'left' ? 0 : 1; meal.chews = 0;
  play('sparkle'); addStars(2);
  setPhase('chew');
  toast('🗡️', 'Hore! Sudah dioper ke geraham!', 'Cinderella lega, lidahnya bersih. Sekarang kunyah cepat bersama Mulan dan Belle!', false);
}

function updateChewUI() {
  const pct = Math.round(meal.chews / meal.target * 100);
  $('#stepTitle').textContent = `Giling cepat di geraham · ${meal.chews}/${meal.target}`;
  const lab = $('.softbar-label', meal.softbar);
  const st = pct < 35 ? 1 : pct < 100 ? 2 : 3;
  lab.textContent = st === 1 ? `🍗🧱 Masih kasar · ${pct}%` : st === 2 ? `🥘 Setengah lumat · ${pct}%` : '✨🥣 Bubur Bintang!';
  meal.softbar.className = 'softbar s' + st;
  $('.bar i', meal.softbar).style.width = pct + '%';
}

function chew(which) {
  if (meal.busy) return;
  if (meal.phase === 'tongue') relay(which);
  if (meal.phase !== 'chew') return;
  const el = meal.sides[which];
  play('chew'); meal.bolus.to(which); meal.bolus.bounce();
  el.classList.remove('chewing'); void el.offsetWidth; el.classList.add('chewing');
  floatText(meal.layer, 'Kres!', which === 'left' ? 19 : 88, 40);
  meal.chews++; updateChewUI();
  if (meal.chews >= meal.target) {
    meal.bolus.emoji('🥣'); meal.bolus.soft(); play('bell');
    setPhase('swallow');
    toast('🥣', 'TING-TING! Sensor Bubur Bintang: sudah halus!', 'Rasakan di mulut Iris: tidak ada yang keras dan sudah licin seperti Bubur Bintang! Jangan diemut lagi ya, satu, dua, tiga… glek!', true);
  }
}
function autoChew() {
  clearInterval(meal.autoT); meal.autoT = 0;
  if (!meal.auto || meal.phase !== 'chew') return;
  meal.autoT = setInterval(() => { meal.side ^= 1; chew(meal.side ? 'right' : 'left'); }, 1150);
}

async function swallowNow() {
  if (meal.phase !== 'swallow' || meal.busy) return;
  meal.busy = true;
  const secs = Math.floor((Date.now() - meal.biteAt) / 1000);
  $('#stepActions').innerHTML = '';
  await swallowSequence(meal.bolus);
  bitesRec.n++; saveBites(); addStars(4); updateBites();
  const line = PRAISE[(bitesRec.n - 1) % PRAISE.length];
  play('bell'); toast('👑', `GLEK! Suapan ke-${bitesRec.n} selesai dalam ${secs} detik!`, `${line} Tidak ditahan di lidah, dikunyah cepat, langsung ditelan saat jadi Bubur Bintang! (+4 bintang)`, true);
  meal.busy = false;
  if (bitesRec.n >= S.goal && !bitesRec.fin) { bitesRec.fin = 1; saveBites(); setPhase('ready'); later(finale, 900); return; }
  if (bitesRec.n % 5 === 0) confetti(20);
  setPhase('ready');
  updateTimer();
}

function updateBites() {
  const g = S.goal, n = bitesRec.n;
  $('#biteText').textContent = `${n} / ${g}`;
  $('#biteBar').style.width = Math.min(100, n / g * 100) + '%';
}
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
function updateTimer() {
  const now = Date.now();
  const bite = meal.phase === 'ready' || !meal.biteAt ? 0 : Math.floor((now - meal.biteAt) / 1000);
  const total = meal.t0 ? Math.floor((now - meal.t0) / 1000) : 0;
  $('#mealTimer').textContent = `⏱ ${fmt(bite)} · 🍽 ${fmt(total)}`;
  if (meal.busy) return;
  const n = Math.floor((now - meal.phaseAt) / 1000);
  if (meal.phase === 'tongue') {
    $('#stepSub').textContent = `👠 Di lidah ${n} dtk. Ayo oper ke geraham Mulan & Belle!`;
    if (n >= 4 && !meal.warned) {
      meal.warned = true; play('wobble');
      toast('👠', 'Cinderella di Lidah Memanggil Iris!', 'Eh Putri Iris sayang, kok makanannya masih parkir di lidahku? Aku Cinderella tidak mau mengunyah lho! Ayo sekarang serahkan ke gigi geraham Mulan dan Belle!', true);
    }
  } else if (meal.phase === 'swallow') {
    $('#stepSub').textContent = `🥣 Sudah halus ${n} dtk! Jangan diemut, ayo GLEK!`;
    if (n >= 5 && !meal.warned) {
      meal.warned = true; play('bell');
      toast('🥣', 'Ting-Ting! Jangan Diemut Lagi Ya!', 'Putri Iris, makanannya sudah halus jadi Bubur Bintang lho! Jangan diemut lagi ya, nanti rasanya hilang! Ayo satu, dua, tiga, glek!', true);
    }
  }
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
  const key = b.dataset.cue, [av, title, msg] = CUES[key];
  play(key === 'smooth' ? 'bell' : key === 'speed' ? 'beat' : 'sparkle'); toast(av, title, msg, true);
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

/* pengaturan suara Princess */
(() => {
  const dlg = $('#voiceDlg'), pitch = $('#voicePitch'), rate = $('#voiceRate'), chime = $('#voiceChime'), sel = $('#voiceSelect');
  const sync = () => { pitch.value = S.pitch; rate.value = S.rate; $('#voicePitchVal').textContent = S.pitch; $('#voiceRateVal').textContent = S.rate; chime.checked = S.chime; };
  $('#btnVoice').addEventListener('click', () => { actx(); loadVoices(); sync(); dlg.showModal(); });
  const close = () => { hush(); dlg.close(); };
  $('#voiceClose').addEventListener('click', close); $('#voiceSave').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  pitch.addEventListener('input', () => { S.pitch = parseFloat(pitch.value); store.set('pitch', S.pitch); $('#voicePitchVal').textContent = S.pitch; });
  rate.addEventListener('input', () => { S.rate = parseFloat(rate.value); store.set('rate', S.rate); $('#voiceRateVal').textContent = S.rate; });
  sel.addEventListener('change', () => { S.voiceURI = sel.value; store.set('voiceURI', S.voiceURI); });
  chime.addEventListener('change', () => { S.chime = chime.checked; store.set('chime', S.chime); });
  $('#voiceTest').addEventListener('click', () => {
    play('sparkle');
    if (S.chime) play('bell'); else say('Halo Putri Iris sayang! Ini suara Princess yang ceria! Ingat ya, jangan tahan makanan di lidah Cinderella, langsung oper ke geraham Mulan dan Belle!');
  });
})();

/* cegah zoom cubit (ketukan cepat tetap diterima: touch-action: manipulation) */
document.addEventListener('gesturestart', e => e.preventDefault());

/* ---------- mulai ---------- */
updateStars(); syncSound(); show('home');

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
})();
