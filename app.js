/* Hero & Giant — kid + parent quest workouts. Offline, localStorage only. */
'use strict';
const KEY = 'heroandgiant.v1';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ART = n => 'art/' + n + '.jpg';

let S = load();
function load(){
  try{ const s = JSON.parse(localStorage.getItem(KEY)); if(s && s.v === 1) return s; }catch(e){}
  return {v:1, lang:(navigator.language||'en').toLowerCase().startsWith('ru')?'ru':'en', hero:{name:'', age:7}, giant:{name:'', lvl:1}, mult:{h:1, g:1}, done:{}, sessions:[], duels:{h:0, g:0}, voice:true, setup:false};
}
function save(){ localStorage.setItem(KEY, JSON.stringify(S)); }
function t(k, v = {}){
  let s = TX[S.lang][k] ?? TX.en[k] ?? k;
  if(typeof s !== 'string') return s;
  v = {H: S.hero.name || 'Hero', G: S.giant.name || 'Giant', ...v};
  for(const x in v) s = s.split('{'+x+'}').join(v[x]);
  return s;
}
const exN = id => EX[id][S.lang][0], exHow = id => EX[id][S.lang][1];
const land = i => LANDS[i][S.lang];

/* ---------- sound & voice ---------- */
let AC = null;
function beep(f = 660, d = .12, type = 'sine', vol = .15){
  try{ AC ||= new (window.AudioContext || window.webkitAudioContext)(); const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.value = vol; o.connect(g); g.connect(AC.destination); const n = AC.currentTime; g.gain.setValueAtTime(vol, n); g.gain.exponentialRampToValueAtTime(.001, n + d); o.start(n); o.stop(n + d); }catch(e){}
}
function fanfare(){ [523,659,784,1047].forEach((f,i) => setTimeout(() => beep(f, .25, 'triangle', .18), i*140)); }
function speak(text){
  if(!S.voice || !('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, ''));
    u.lang = S.lang === 'ru' ? 'ru-RU' : 'en-US'; u.rate = 1.02; u.pitch = 1.05;
    const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith(S.lang));
    if(vs.length) u.voice = vs.find(v => /natural|online|google|siri|milena|yuri/i.test(v.name)) || vs[0];
    speechSynthesis.speak(u);
  }catch(e){}
}

/* ---------- scaling ---------- */
function kidF(){ const a = +S.hero.age; return a <= 6 ? .5 : a <= 8 ? .65 : a <= 10 ? .8 : 1; }
function giantF(){ return [.7, 1, 1.35][S.giant.lvl] || 1; }
function target(id, who){
  const e = EX[id], f = (who === 'h' ? kidF() * S.mult.h : giantF() * S.mult.g);
  let n = Math.round(e.base * f);
  if(e.type === 'time') n = Math.max(who === 'h' ? 10 : 15, Math.min(n, 60));
  else n = Math.max(3, n);
  return n;
}
const STATIC = new Set(['k_flamingo','k_superman','k_tree','g_plank','g_wallsit','g_snow']);
function tgtTxt(id, who, round, cap){
  let n = target(id, who);
  if(EX[id].type === 'time'){ if(cap) n = Math.min(n, cap); return STATIC.has(id) ? t('hold', {n}) : t('sec', {n}); }
  return round === 'duel' ? t('reps', {n}) : t('aim', {n});
}

/* ---------- screens ---------- */
function show(html){ $('#app').innerHTML = `<div class="scr">${html}</div>`; window.scrollTo(0,0); }
function sheet(html, onClick){ const m = $('#modal'); $('#sheet').innerHTML = html; m.classList.add('on'); m.onclick = e => { if(e.target === m) closeSheet(); else onClick && onClick(e); }; }
function closeSheet(){ $('#modal').classList.remove('on'); }

function splash(){
  show(`<div class="splash"><img class="art" src="${ART('heroes')}" alt=""><h1 class="title" style="margin-top:18px">${t('title')}</h1><p class="mut" style="font-size:17px;margin:8px 10px 22px">${t('tag')}</p>
  <button class="btn gold wide" id="go">${S.setup ? esc(t('cont')) : t('start')}</button>
  <div class="seg" style="margin:16px auto 0;max-width:200px"><button data-l="en" class="${S.lang==='en'?'on':''}">EN</button><button data-l="ru" class="${S.lang==='ru'?'on':''}">RU</button></div>
  <p class="safety">${t('priv')}</p></div>`);
  $('#go').onclick = () => { beep(880); S.setup ? mapScreen() : setup(); };
  document.querySelectorAll('[data-l]').forEach(b => b.onclick = () => { S.lang = b.dataset.l; save(); splash(); });
}

function setup(fromSettings){
  const lv = TX[S.lang].lv;
  show(`<h2 style="font-size:26px;margin:6px 0 4px">${t('setupT')}</h2>
  <div class="card" style="border-color:#4fb3ff88;margin-top:14px"><div class="lbl" style="margin-top:0;color:var(--hero)">🛡️ ${t('heroL')}</div><input id="hn" maxlength="16" placeholder="${t('heroPh')}" value="${esc(S.hero.name)}">
  <div class="lbl">${t('age')}: <b id="av">${t('kidAge',{n:S.hero.age})}</b></div><input id="ha" type="range" min="5" max="12" value="${S.hero.age}" style="padding:0;accent-color:#4fb3ff"></div>
  <div class="card" style="border-color:#ffa64d88"><div class="lbl" style="margin-top:0;color:var(--giant)">🪨 ${t('giantL')}</div><input id="gn" maxlength="16" placeholder="${t('giantPh')}" value="${esc(S.giant.name)}">
  <div class="lbl">${t('lvl')}</div><div class="seg" id="gl">${lv.map((x,i)=>`<button data-v="${i}" class="${S.giant.lvl===i?'on':''}">${x}</button>`).join('')}</div></div>
  <button class="btn gold wide" id="ok">${fromSettings ? t('save') : t('go')}</button><p class="safety">⚠️ ${t('safety')}</p>`);
  $('#ha').oninput = e => $('#av').textContent = t('kidAge',{n:e.target.value});
  document.querySelectorAll('#gl button').forEach(b => b.onclick = () => { document.querySelectorAll('#gl button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#ok').onclick = () => {
    const hn = $('#hn').value.trim(), gn = $('#gn').value.trim();
    if(!hn){ $('#hn').focus(); return; } if(!gn){ $('#gn').focus(); return; }
    S.hero = {name: hn, age: +$('#ha').value}; S.giant = {name: gn, lvl: +document.querySelector('#gl .on').dataset.v}; S.setup = true; save(); beep(880); mapScreen();
  };
}

function weekCount(){ const wk = Date.now() - 7*864e5; return S.sessions.filter(x => x > wk).length; }
function mapScreen(){
  const doneN = Object.keys(S.done).length, starsN = Object.values(S.done).reduce((a,b)=>a+b,0);
  let nodes = '';
  LANDS.forEach((L, i) => {
    const st = S.done[i], unlocked = i === 0 || S.done[i-1] !== undefined || st !== undefined;
    const cls = st !== undefined ? 'done' : unlocked ? 'next grey' : 'locked';
    nodes += `<div class="node ${cls}" data-land="${i}"><div class="pic"><img src="${ART(L.img)}" alt="" loading="lazy">${unlocked?'':'<div class="lock">🔒</div>'}</div><div><div class="nm">${i+1}. ${land(i).n}</div><div class="st">${st!==undefined ? '⭐'.repeat(st) + '☆'.repeat(3-st) : unlocked ? '☆☆☆' : ''}</div><div class="bs">👾 ${land(i).b}</div></div></div>`;
  });
  show(`<div class="top"><div><h2 style="font-size:24px">${t('mapT')}</h2><div class="mut" style="font-size:14px">🛡️ ${esc(S.hero.name)} &nbsp;🪨 ${esc(S.giant.name)}</div></div><div class="sp"></div><button class="icon-btn" id="alb">🎴</button><button class="icon-btn" id="set">⚙️</button></div>
  <div class="stats"><div class="stat"><b>${weekCount()}</b><span>${t('week')}</span></div><div class="stat"><b><span style="color:var(--hero);font-size:22px">${S.duels.h}</span> : <span style="color:var(--giant);font-size:22px">${S.duels.g}</span></b><span>${t('duels')}</span></div><div class="stat"><b>${starsN}<small style="font-size:14px">/24</small></b><span>${t('stars')}</span></div></div>
  ${doneN === 8 ? `<div class="card" style="text-align:center;border-color:var(--gold)">🌈 ${t('allDone')}</div>` : ''}
  <div class="path">${nodes}</div>
  <div class="card" style="border-color:#c58bff88"><b>✨ ${t('proT')}</b><div class="mut" style="font-size:14px;margin:6px 0 10px">${t('proP')}</div><button class="btn wide" id="pro">${localStorage.getItem('hg.pro') ? '✓ ' + t('proThanks') : t('proBtn')}</button></div>
  <p class="safety">${t('priv')}</p>`);
  document.querySelectorAll('[data-land]').forEach(n => n.onclick = () => {
    const i = +n.dataset.land;
    if(n.classList.contains('locked')){ beep(220, .2, 'square', .08); n.animate([{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'none'}], {duration:250}); return; }
    beep(700); intro(i);
  });
  $('#set').onclick = settings; $('#alb').onclick = album;
  $('#pro').onclick = () => { localStorage.setItem('hg.pro', '1'); $('#pro').textContent = '✓ ' + t('proThanks'); fanfare(); };
}

function album(){
  sheet(`<h2>🎴 ${t('stickers')}</h2><div class="album" style="margin-top:14px">${LANDS.map((L,i)=>`<div style="text-align:center"><img class="${S.done[i]===undefined?'no':''}" src="${ART(L.img)}"><div style="font-size:11px;margin-top:4px" class="mut">${land(i).n}</div></div>`).join('')}</div><button class="btn wide" style="margin-top:16px" data-x="c">OK</button>`, e => { if(e.target.closest('[data-x]')) closeSheet(); });
}
function settings(){
  sheet(`<h2>⚙️ ${t('settings')}</h2>
  <div class="lbl">${t('lang')}</div><div class="seg"><button data-l="en" class="${S.lang==='en'?'on':''}">English</button><button data-l="ru" class="${S.lang==='ru'?'on':''}">Русский</button></div>
  <div class="lbl">${t('voice')}</div><div class="seg"><button data-vo="1" class="${S.voice?'on':''}">${t('on')}</button><button data-vo="0" class="${!S.voice?'on':''}">${t('off')}</button></div>
  <div class="row" style="margin-top:18px"><button class="btn" style="flex:1" data-x="edit">🛡️🪨 ${t('setupT').replace('?','')}</button></div>
  <button class="btn wide" style="margin-top:10px;color:#ff9a8a" data-x="reset">${t('reset')}</button>`, e => {
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.l){ S.lang = b.dataset.l; save(); closeSheet(); mapScreen(); }
    if(b.dataset.vo){ S.voice = b.dataset.vo === '1'; save(); closeSheet(); settings(); }
    if(b.dataset.x === 'edit'){ closeSheet(); setup(true); }
    if(b.dataset.x === 'reset' && confirm(t('resetQ'))){ localStorage.removeItem(KEY); S = load(); closeSheet(); splash(); }
  });
}

function intro(i){
  const L = land(i), txt = t('x', {}).replace('x','') + L.i.split('{H}').join(S.hero.name).split('{G}').join(S.giant.name);
  show(`<div class="top"><button class="icon-btn" id="back">←</button><h2 style="font-size:22px">${i+1}. ${L.n}</h2></div>
  <img class="landimg grey" src="${ART(LANDS[i].img)}" alt=""><p class="story">${esc(txt)}</p>
  <button class="btn gold wide" id="start">⚔️ ${S.done[i]!==undefined ? t('replay') : t('play')}</button><p class="safety">⚠️ ${t('safety')}</p>`);
  $('#back').onclick = mapScreen;
  $('#start').onclick = () => { speechSynthesis && speechSynthesis.cancel(); runMission(i); };
  setTimeout(() => speak(txt), 300);
}

/* ---------- mission engine ---------- */
let M = null, TM = null;
function buildSteps(i){
  const P = k => PAIRS[k % PAIRS.length];
  const duelIdx = DUEL_OK[i % DUEL_OK.length];
  const used = new Set([9, duelIdx]);
  const pick = n => { let k = n; while(used.has(k % 12)) k++; used.add(k % 12); return k % 12; };
  const a = pick(i*2+1), b = pick(i*2+4), c = pick(i*3+7);
  const choices = [pick(i+2), pick(i+5), pick(i+8)];
  return [
    {k:'warm', pair:P(9), time:30},
    {k:'team', pair:P(a), time:40},
    {k:'choice', choices, time:40},
    {k:'duel', pair:P(duelIdx)},
    {k:'team', pair:P(b), time:40},
    {k:'final', pair:P(c), time:30},
  ];
}
function runMission(i){
  M = {land:i, steps:buildSteps(i), idx:0, hits:0, max:0, duelWins:{h:0,g:0}};
  M.max = M.steps.reduce((a,s)=> a + (s.k === 'duel' ? 3 : 2), 0);
  step();
}
function bossBar(){
  const L = land(M.land), left = Math.max(0, 1 - M.hits / M.max);
  return `<div class="boss"><img id="bossimg" src="${ART(LANDS[M.land].boss)}" alt=""><div class="hp"><div class="nm">👾 ${L.b}</div><div class="bar"><i style="width:${left*100}%"></i></div></div><button class="icon-btn" id="quit">✕</button></div>`;
}
function bindQuit(){ const q = $('#quit'); if(q) q.onclick = () => { if(confirm(t('quitQ'))){ stopTimer(); speechSynthesis && speechSynthesis.cancel(); mapScreen(); } }; }
function stopTimer(){ clearInterval(TM); TM = null; }
function hitFx(n){
  if(n <= 0) return;
  M.hits += n;
  const img = $('#bossimg'); if(img){ img.classList.remove('shake'); void img.offsetWidth; img.classList.add('shake'); }
  const bar = document.querySelector('.hp .bar i'); if(bar) bar.style.width = Math.max(0, 1 - M.hits / M.max) * 100 + '%';
  const fx = document.createElement('div'); fx.className = 'hitfx'; fx.textContent = t('hit') + (n > 1 ? ' ×' + n : ''); document.body.appendChild(fx); setTimeout(() => fx.remove(), 1000);
  beep(180, .18, 'sawtooth', .12); setTimeout(() => beep(120, .2, 'square', .08), 90);
}
function roundName(k){ return {warm:t('warm'), team:t('team'), choice:t('choice'), duel:t('duel'), final:t('final')}[k]; }

function step(){
  stopTimer();
  if(M.idx >= M.steps.length) return victory();
  const s = M.steps[M.idx];
  if(s.k === 'choice' && !s.pair) return choiceScreen(s);
  if(s.k === 'duel') return duelScreen(s);
  timedRound(s);
}
function duoCards(pair, round, cap){
  const [kid, gi] = pair;
  return `<div class="duo"><div class="pc h"><div class="who">🛡️ ${esc(S.hero.name)}</div><div class="em">${EX[kid].em}</div><div class="mv">${exN(kid)}</div><div class="tg">${tgtTxt(kid,'h',round,cap)}</div><div class="how">${exHow(kid)}</div></div>
  <div class="pc g"><div class="who">🪨 ${esc(S.giant.name)}</div><div class="em">${EX[gi].em}</div><div class="mv">${exN(gi)}</div><div class="tg">${tgtTxt(gi,'g',round,cap)}</div><div class="how">${exHow(gi)}</div></div></div>`;
}
function timedRound(s){
  let left = s.time, paused = false, started = false;
  const R = 74, C = 2 * Math.PI * R;
  show(`${bossBar()}<div class="rtitle">${roundName(s.k)}</div><div class="rsub">${M.idx+1} / ${M.steps.length}</div>
  <div class="timer"><svg viewBox="0 0 170 170"><circle cx="85" cy="85" r="${R}" stroke="#ffffff1a" stroke-width="12" fill="none"/><circle id="ring" cx="85" cy="85" r="${R}" stroke="url(#tg)" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="0"/><defs><linearGradient id="tg"><stop offset="0" stop-color="#4fb3ff"/><stop offset="1" stop-color="#ffa64d"/></linearGradient></defs></svg><div class="num" id="num">3</div></div>
  ${duoCards(s.pair, s.k, s.time)}
  <div class="ctrl"><button class="btn" id="pz">⏸ ${t('pause')}</button><button class="btn" id="sk">⏭ ${t('skip')}</button></div>`);
  bindQuit();
  const [kid, gi] = s.pair;
  speak(`${roundName(s.k)}. ${S.hero.name}: ${exN(kid)}. ${S.giant.name}: ${exN(gi)}.`);
  let pre = 3 + 2; // 2 s for the announcement, then 3-2-1
  const tick = () => {
    if(paused) return;
    if(!started){
      pre--;
      if(pre <= 3 && pre > 0){ $('#num').textContent = pre; beep(600); }
      if(pre === 0){ started = true; $('#num').textContent = left; beep(990, .3); speak(t('goV')); }
      return;
    }
    left--;
    $('#num').textContent = Math.max(left, 0);
    $('#ring').style.strokeDashoffset = C * (1 - left / s.time);
    if(left === Math.floor(s.time / 2)) speak(t('halfway'));
    if(left <= 3 && left > 0) beep(600);
    if(left <= 0){ stopTimer(); beep(990, .4, 'triangle'); checkScreen(s); }
  };
  TM = setInterval(tick, 1000);
  $('#pz').onclick = () => { paused = !paused; $('#pz').innerHTML = paused ? '▶ ' + t('resume') : '⏸ ' + t('pause'); };
  $('#sk').onclick = () => { stopTimer(); checkScreen(s); };
}
function checkScreen(s){
  const on = {h:true, g:true};
  show(`${bossBar()}<div class="rtitle" style="margin-top:10px">${t('didQ')}</div>
  <div class="check"><button class="tog h on" data-w="h"><span class="big">🛡️</span>${esc(t('heroDid'))}</button><button class="tog g on" data-w="g"><span class="big">🪨</span>${esc(t('giantDid'))}</button></div>
  <button class="btn gold wide" id="nx">⚔️ ${t('next')}</button>`);
  bindQuit();
  document.querySelectorAll('.tog').forEach(b => b.onclick = () => { on[b.dataset.w] = !on[b.dataset.w]; b.classList.toggle('on', on[b.dataset.w]); beep(on[b.dataset.w] ? 800 : 300); });
  $('#nx').onclick = () => {
    $('#nx').disabled = true;
    hitFx((on.h ? 1 : 0) + (on.g ? 1 : 0));
    setTimeout(() => { M.idx++; restScreen(); }, 1000);
  };
}
function restScreen(){
  if(M.idx >= M.steps.length) return victory();
  const s = M.steps[M.idx]; let left = 15;
  const nextTxt = s.k === 'choice' ? t('choice') : s.k === 'duel' ? t('duel') : `${EX[s.pair[0]].em} ${exN(s.pair[0])} · ${EX[s.pair[1]].em} ${exN(s.pair[1])}`;
  show(`${bossBar()}<div class="rest"><div class="em">🍃</div><div class="rtitle">${t('rest')}</div><div class="stopw" id="rs">${left}</div><div class="mut">${t('restNext')}<b style="color:var(--tx)">${roundName(s.k)}</b><br>${nextTxt}</div>
  <div class="ctrl"><button class="btn gold" id="nx">${t('next')} ⏭</button></div></div>`);
  bindQuit(); speak(t('restV'));
  TM = setInterval(() => { left--; $('#rs').textContent = left; if(left <= 3 && left > 0) beep(500, .08); if(left <= 0) step(); }, 1000);
  $('#nx').onclick = step;
}
function choiceScreen(s){
  show(`${bossBar()}<div class="rtitle">👑 ${t('choice')}</div><div class="rsub" style="font-size:16px;color:var(--tx)">${esc(t('choiceQ'))}</div><div class="rsub">${t('choiceSub')}</div>
  <div class="cards3">${s.choices.map(k => { const g = PAIRS[k][1]; return `<button class="c3" data-k="${k}"><span class="em">${EX[g].em}</span>${exN(g)}<span class="t">${tgtTxt(g,'g','team',40)}</span></button>`; }).join('')}</div>`);
  bindQuit(); speak(t('choiceQ'));
  document.querySelectorAll('.c3').forEach(b => b.onclick = () => { fanfare(); s.pair = PAIRS[+b.dataset.k]; timedRound(s); });
}
function duelScreen(s){
  const [kid, gi] = s.pair, tg = {h: target(kid,'h'), g: target(gi,'g')};
  let t0 = 0, fin = {h:0, g:0}, winner = null, TMd = null;
  show(`${bossBar()}<div class="rtitle">⚔️ ${t('duelT')}</div><div class="rsub">${t('duelSub')}</div>
  ${duoCards(s.pair, 'duel')}<div class="stopw" id="sw">0.0</div>
  <div class="duo"><button class="duelbtn h" data-w="h" disabled>🛡️ ${esc(t('heroFin'))}<small>${t('reps',{n:tg.h})}</small></button><button class="duelbtn g" data-w="g" disabled>🪨 ${esc(t('giantFin'))}<small>${t('reps',{n:tg.g})}</small></button></div>
  <div id="res"></div><button class="btn gold wide" id="gobtn" style="margin-top:14px">${t('duelGo')}</button>`);
  bindQuit();
  speak(t('duelT'));
  $('#gobtn').onclick = () => {
    $('#gobtn').style.display = 'none'; let c = 3;
    const cd = setInterval(() => {
      if(c > 0){ $('#sw').textContent = c; beep(600); speak([t('one'),t('two'),t('three')][c-1]); c--; return; }
      clearInterval(cd); beep(990, .35); speak(t('goV')); t0 = performance.now();
      document.querySelectorAll('.duelbtn').forEach(b => b.disabled = false);
      TMd = setInterval(() => { $('#sw').textContent = ((performance.now() - t0)/1000).toFixed(1); }, 100);
      TM = TMd;
    }, 900);
  };
  document.querySelectorAll('.duelbtn').forEach(b => b.onclick = () => {
    const w = b.dataset.w; if(fin[w] || !t0) return;
    fin[w] = (performance.now() - t0) / 1000; b.classList.add('fin'); b.disabled = true;
    b.querySelector('small').textContent = t('sec', {n: fin[w].toFixed(1)});
    if(!winner){ winner = w; beep(1100, .3, 'triangle'); const nm = w === 'h' ? S.hero.name : S.giant.name; $('#res').innerHTML = `<div class="win">${esc(t('duelWin',{W:nm}))}</div>`; speak(t('duelWin',{W:nm})); confetti(30); }
    if(fin.h && fin.g){
      clearInterval(TMd); TM = null;
      S.duels[winner]++; M.duelWins[winner]++; save();
      setTimeout(() => { hitFx(3); setTimeout(() => { M.idx++; restScreen(); }, 1100); }, 1200);
    }
  });
}
function confetti(n){
  const cols = ['#4fb3ff','#ffa64d','#ffd84d','#6be38f','#ff7bc0','#c58bff'];
  for(let i=0;i<n;i++){ const c = document.createElement('div'); c.className = 'confetti'; c.style.left = Math.random()*100 + 'vw'; c.style.background = cols[i % cols.length]; c.style.animationDuration = (1.8 + Math.random()*1.6) + 's'; c.style.animationDelay = (Math.random()*.4) + 's'; c.style.borderRadius = i % 3 ? '2px' : '50%'; document.body.appendChild(c); setTimeout(() => c.remove(), 3800); }
}
function victory(){
  stopTimer();
  const i = M.land, ratio = M.hits / M.max, stars = ratio >= .9 ? 3 : ratio >= .6 ? 2 : 1;
  S.done[i] = Math.max(S.done[i] || 0, stars); S.sessions.push(Date.now()); S.sessions = S.sessions.slice(-200); save();
  const L = land(i), out = L.o.split('{H}').join(S.hero.name).split('{G}').join(S.giant.name);
  const rate = {h:'ok', g:'ok'};
  show(`<div class="rtitle" style="font-size:30px;color:var(--gold)">🌈 ${t('victory')}</div>
  <img class="landimg grey" id="vimg" src="${ART(LANDS[i].img)}" alt="" style="margin-top:10px">
  <div class="stars">${[0,1,2].map(k=>`<span style="animation-delay:${.6+k*.35}s">${k < stars ? '⭐' : '☆'}</span>`).join('')}</div>
  <p class="story" style="text-align:center">${esc(out)}</p>
  <div class="card"><b>${t('rateQ')}</b>
   <div class="lbl" style="color:var(--hero)">🛡️ ${esc(t('rateHero'))}</div><div class="rate" data-w="h">${['easy','ok','hard'].map(x=>`<button data-r="${x}" class="${x==='ok'?'on':''}">${t(x)}</button>`).join('')}</div>
   <div class="lbl" style="color:var(--giant)">🪨 ${esc(t('rateGiant'))}</div><div class="rate" data-w="g">${['easy','ok','hard'].map(x=>`<button data-r="${x}" class="${x==='ok'?'on':''}">${t(x)}</button>`).join('')}</div></div>
  <button class="btn gold wide" id="tomap">🗺️ ${t('toMap')}</button>`);
  setTimeout(() => { const v = $('#vimg'); if(v) v.classList.remove('grey'); fanfare(); confetti(70); }, 400);
  setTimeout(() => speak(t('victory') + '. ' + out), 900);
  document.querySelectorAll('.rate').forEach(r => r.querySelectorAll('button').forEach(b => b.onclick = () => { rate[r.dataset.w] = b.dataset.r; r.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }));
  $('#tomap').onclick = () => {
    for(const w of ['h','g']){ const m = rate[w] === 'easy' ? 1.12 : rate[w] === 'hard' ? .88 : 1; S.mult[w] = Math.min(2, Math.max(.5, +(S.mult[w] * m).toFixed(3))); }
    save(); speechSynthesis && speechSynthesis.cancel(); mapScreen();
  };
}

if('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => {};
splash();
if(location.protocol.startsWith('http') && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
