/* ===================================
   Twitch Prediction Overlay – JS
   StreamElements Custom Widget
   =================================== */

'use strict';

let state = {
  active: false,
  title: '',
  status: 'active',
  outcomes: [],
  endTime: null,
  timerInterval: null,
  hideTimeout: null
};

let cfg = {
  color1: '#5b9cf6',
  color2: '#d672f5',
  showTimer: true,
  hideDelay: 8
};

/* ================================================================
   STREAMELEMENTS EVENTS
   ================================================================ */

window.addEventListener('onWidgetLoad', (obj) => {
  const f = obj.detail.fieldData;
  applyConfig(f);
  if (f.previewMode === true || f.previewMode === 'true') showPreview();
});

window.addEventListener('onEventReceived', (obj) => {
  const { listener, event: data } = obj.detail;

  if (listener === 'event:test' && data.type === 'prediction-test') { showPreview(); return; }

  if (listener === 'prediction-begin')    onBegin(data);
  if (listener === 'prediction-progress') onProgress(data);
  if (listener === 'prediction-lock')     onLock(data);
  if (listener === 'prediction-end')      onEnd(data);
});

/* ================================================================
   HANDLERS
   ================================================================ */

function onBegin(d) {
  clearTimers();
  state = {
    active: true,
    title: d.title || 'Prédiction',
    status: 'active',
    outcomes: (d.outcomes || []).map(o => ({ id: o.id, title: o.title, channel_points: 0, users: 0 })),
    endTime: d.locks_at ? new Date(d.locks_at) : null,
    timerInterval: null,
    hideTimeout: null
  };
  render();
  show();
  if (cfg.showTimer && state.endTime) startTimer();
}

function onProgress(d) {
  if (!state.active) return;
  state.outcomes = map(d.outcomes);
  updateBars(); updateStats();
}

function onLock(d) {
  if (!state.active) return;
  state.status = 'locked';
  if (d.outcomes) state.outcomes = map(d.outcomes);
  clearTimers();
  setBadge(); updateBars(); updateStats();
}

function onEnd(d) {
  if (!state.active) return;
  state.status = 'ended';
  const wid = d.winning_outcome_id;
  state.outcomes = (d.outcomes || []).map(o => ({ ...o, channel_points: o.channel_points || 0, users: o.users || 0, isWinner: o.id === wid }));
  clearTimers();
  renderResult(); setBadge(); updateBars(); updateStats();
  state.hideTimeout = setTimeout(hide, cfg.hideDelay * 1000);
}

/* ================================================================
   RENDER
   ================================================================ */

function render() {
  el('prediction-title').textContent = state.title;
  el('opt-1-name').textContent = state.outcomes[0]?.title || '';
  el('opt-2-name').textContent = state.outcomes[1]?.title || '';
  el('opt-1-badge').className = 'opt-badge';
  el('opt-2-badge').className = 'opt-badge';
  el('opt-1-badge').textContent = '';
  el('opt-2-badge').textContent = '';
  el('option-1').className = 'option';
  el('option-2').className = 'option';
  setBadge(); updateBars(); updateStats();
}

function renderResult() {
  state.outcomes.forEach((o, i) => {
    const num = i + 1;
    const card  = el(`option-${num}`);
    const badge = el(`opt-${num}-badge`);
    if (!card || !badge) return;
    card.className  = `option ${o.isWinner ? 'winner' : 'loser'}`;
    badge.className = `opt-badge ${o.isWinner ? 'win' : 'lose'}`;
    badge.textContent = o.isWinner ? '🏆 Gagnant' : 'Perdant';
  });
}

function updateBars() {
  const total = state.outcomes.reduce((a, o) => a + (o.channel_points || 0), 0);
  state.outcomes.forEach((o, i) => {
    const bar = el(`opt-${i+1}-bar`);
    if (!bar) return;
    bar.style.width = (total > 0 ? Math.round((o.channel_points / total) * 100) : 50) + '%';
  });
}

function updateStats() {
  const total = state.outcomes.reduce((a, o) => a + (o.channel_points || 0), 0);
  const totalU = state.outcomes.reduce((a, o) => a + (o.users || 0), 0);
  state.outcomes.forEach((o, i) => {
    const n = i + 1;
    const pts = o.channel_points || 0;
    const pct = total > 0 ? Math.round((pts / total) * 100) : 50;
    setText(`opt-${n}-pts`,   fmt(pts) + ' pts');
    setText(`opt-${n}-users`, fmt(o.users || 0));
    setText(`opt-${n}-pct`,   pct + '%');
  });
  setText('total-pts',   fmt(total));
  setText('total-users', fmt(totalU));
}

function setBadge() {
  const map = { active: ['EN COURS','s-active'], locked: ['VERROUILLÉ','s-locked'], ended: ['TERMINÉ','s-ended'] };
  const [txt, cls] = map[state.status] || map.active;
  const b = el('status-badge');
  b.textContent = txt;
  b.className = `status ${cls}`;
}

/* ================================================================
   TIMER
   ================================================================ */

function startTimer() {
  const disp = el('timer-display');
  if (!disp) return;
  state.timerInterval = setInterval(() => {
    const diff = Math.max(0, Math.floor((state.endTime - Date.now()) / 1000));
    disp.textContent = diff >= 60 ? `${Math.floor(diff/60)}:${(diff%60).toString().padStart(2,'0')}` : `${diff}s`;
    disp.classList.toggle('urgent', diff <= 10);
    if (diff === 0) clearInterval(state.timerInterval);
  }, 1000);
}

/* ================================================================
   SHOW / HIDE
   ================================================================ */

function show() {
  const w = el('prediction-widget');
  w.classList.remove('hidden','out');
  w.classList.add('in');
  setTimeout(() => w.classList.remove('in'), 500);
}

function hide() {
  const w = el('prediction-widget');
  w.classList.add('out');
  setTimeout(() => { w.classList.add('hidden'); w.classList.remove('out'); state.active = false; }, 350);
}

/* ================================================================
   CONFIG
   ================================================================ */

function applyConfig(f) {
  if (f.color1) cfg.color1 = f.color1;
  if (f.color2) cfg.color2 = f.color2;
  if (f.showTimer !== undefined) cfg.showTimer = f.showTimer === true || f.showTimer === 'true';
  if (f.hideDelay) cfg.hideDelay = parseInt(f.hideDelay, 10) || 8;

  const r = document.documentElement;
  r.style.setProperty('--c1', cfg.color1);
  r.style.setProperty('--c2', cfg.color2);

  if (!cfg.showTimer) {
    const t = el('timer-display');
    if (t) t.style.display = 'none';
  }
}

/* ================================================================
   PREVIEW / TEST
   ================================================================ */

function showPreview() {
  onBegin({
    title: 'Ce run finit-il en moins de 30 min ?',
    locks_at: new Date(Date.now() + 60000).toISOString(),
    outcomes: [
      { id:'1', title:'✅ Oui, facile !' },
      { id:'2', title:'❌ Non, trop dur' }
    ]
  });
  setTimeout(() => onProgress({
    outcomes: [
      { id:'1', title:'✅ Oui, facile !',  channel_points: 12450, users: 87 },
      { id:'2', title:'❌ Non, trop dur', channel_points: 8200,  users: 53 }
    ]
  }), 400);
}

/* ================================================================
   UTILS
   ================================================================ */

const el = (id) => document.getElementById(id);
const setText = (id, v) => { const e = el(id); if (e) e.textContent = v; };
const fmt = (n) => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'k' : String(n);
const map = (arr) => (arr||[]).map(o => ({ id:o.id, title:o.title, channel_points:o.channel_points||0, users:o.users||0 }));

function clearTimers() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  if (state.hideTimeout)   clearTimeout(state.hideTimeout);
}
