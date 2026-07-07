/* =========================================
   Twitch Prediction Overlay – JS v5
   ========================================= */

'use strict';

let state = {
  active: false,
  title: '',
  status: 'active',
  outcomes: [],
  endTime: null,
  timerInterval: null,
  hideTimeout: null,
  previewInterval: null
};

let cfg = {
  color1:    '#5b9cf6',
  color2:    '#d672f5',
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
    outcomes: (d.outcomes || []).map(o => ({ id:o.id, title:o.title, channel_points:0, users:0 })),
    endTime: d.locks_at ? new Date(d.locks_at) : null,
    timerInterval: null,
    hideTimeout: null,
    previewInterval: null
  };
  render();
  show();
  if (cfg.showTimer && state.endTime) startTimer();
}

function onProgress(d) {
  if (!state.active) return;
  state.outcomes = mapOutcomes(d.outcomes);
  updateBars();
  updateStats();
}

function onLock(d) {
  if (!state.active) return;
  state.status = 'locked';
  if (d.outcomes) state.outcomes = mapOutcomes(d.outcomes);
  clearInterval(state.timerInterval);
  // Timer affiche "--"
  const t = el('timer-display');
  if (t) { t.textContent = '--'; t.classList.remove('urgent'); }
  setBadgeStatus();
  updateBars();
  updateStats();
}

function onEnd(d) {
  if (!state.active) return;
  clearTimers();
  state.status = 'ended';
  const wid = d.winning_outcome_id;
  state.outcomes = (d.outcomes || []).map(o => ({
    id: o.id, title: o.title,
    channel_points: o.channel_points || 0,
    users: o.users || 0,
    isWinner: o.id === wid
  }));
  renderResult();
  setBadgeStatus();
  updateBars();
  updateStats();
  // Cacher le timer
  const t = el('timer-display');
  if (t) t.style.display = 'none';
  state.hideTimeout = setTimeout(hide, cfg.hideDelay * 1000);
}

/* ================================================================
   RENDER
   ================================================================ */

function render() {
  el('prediction-title').textContent = state.title;
  el('opt-1-name').textContent = state.outcomes[0]?.title || '';
  el('opt-2-name').textContent = state.outcomes[1]?.title || '';
  ['1','2'].forEach(n => {
    el(`option-${n}`).className = 'option' + (n==='2' ? ' right' : '');
    const b = el(`opt-${n}-badge`);
    b.className = 'opt-badge';
    b.textContent = '';
  });
  // Reset timer
  const t = el('timer-display');
  if (t) { t.style.display = ''; t.classList.remove('urgent'); }
  setBadgeStatus();
  updateBars();
  updateStats();
}

function renderResult() {
  state.outcomes.forEach((o, i) => {
    const n = i + 1;
    const card  = el(`option-${n}`);
    const badge = el(`opt-${n}-badge`);
    if (!card || !badge) return;
    card.className  = `option${n===2?' right':''} ${o.isWinner ? 'winner' : 'loser'}`;
    badge.className = `opt-badge ${o.isWinner ? 'win' : 'lose'}`;
    badge.textContent = o.isWinner ? '🏆 Gagnant' : 'Perdant';
  });
}

function updateBars() {
  const total = state.outcomes.reduce((a, o) => a + (o.channel_points||0), 0);
  const pct1  = total > 0 ? Math.round((state.outcomes[0]?.channel_points||0) / total * 100) : 50;
  const pct2  = 100 - pct1;
  el('bar-left').style.width   = pct1 + '%';
  setText('bar-pct-1', pct1 + '%');
  setText('bar-pct-2', pct2 + '%');
}

function updateStats() {
  const total  = state.outcomes.reduce((a, o) => a + (o.channel_points||0), 0);
  const totalU = state.outcomes.reduce((a, o) => a + (o.users||0), 0);
  state.outcomes.forEach((o, i) => {
    const n = i + 1;
    setText(`opt-${n}-pts`,   fmt(o.channel_points||0) + ' pts');
    setText(`opt-${n}-users`, fmt(o.users||0));
  });
  setText('total-pts',   fmt(total));
  setText('total-users', fmt(totalU));
}

function setBadgeStatus() {
  const map = {
    active: ['EN COURS',   's-active'],
    locked: ['VERROUILLÉ', 's-locked'],
    ended:  ['TERMINÉ',    's-ended']
  };
  const [txt, cls] = map[state.status] || map.active;
  const b = el('status-badge');
  b.textContent = txt;
  b.className = `status ${cls}`;
}

/* ================================================================
   TIMER (dans la barre, centré)
   ================================================================ */

function startTimer() {
  const disp = el('timer-display');
  if (!disp) return;
  disp.style.display = '';
  state.timerInterval = setInterval(() => {
    const diff = Math.max(0, Math.floor((state.endTime - Date.now()) / 1000));
    disp.textContent = diff >= 60
      ? `${Math.floor(diff/60)}:${String(diff%60).padStart(2,'0')}`
      : `${diff}s`;
    disp.classList.toggle('urgent', diff <= 10);
    if (diff === 0) clearInterval(state.timerInterval);
  }, 1000);
}

/* ================================================================
   SHOW / HIDE
   ================================================================ */

function show() {
  const w = el('prediction-widget');
  w.classList.remove('hidden', 'out');
  w.classList.add('in');
  setTimeout(() => w.classList.remove('in'), 500);
}

function hide() {
  stopPreviewAnimation();
  const w = el('prediction-widget');
  w.classList.add('out');
  setTimeout(() => {
    w.classList.add('hidden');
    w.classList.remove('out');
    state.active = false;
  }, 350);
}

/* ================================================================
   PREVIEW AVEC ANIMATION
   ================================================================ */

function showPreview() {
  onBegin({
    title: 'Ce run finit-il en moins de 30 min ?',
    locks_at: new Date(Date.now() + 90000).toISOString(),
    outcomes: [
      { id:'1', title:'✅ Oui, facile !' },
      { id:'2', title:'❌ Non, trop dur' }
    ]
  });

  let step = 0;
  const steps = [
    [800,   800,  10, 10],
    [2400,  1200, 28, 15],
    [4500,  2800, 52, 31],
    [5800,  5200, 61, 58],
    [7200,  8100, 73, 85],
    [8900, 10500, 84, 99],
    [9600, 12200, 90,110],
    [11000,14800, 97,130],
    [12450, 8200, 87, 53]
  ];

  onProgress({
    outcomes: [
      { id:'1', title:'✅ Oui, facile !',  channel_points: steps[0][0], users: steps[0][2] },
      { id:'2', title:'❌ Non, trop dur', channel_points: steps[0][1], users: steps[0][3] }
    ]
  });

  state.previewInterval = setInterval(() => {
    step++;
    if (step >= steps.length) { clearInterval(state.previewInterval); return; }
    const [p1, p2, pu1, pu2] = steps[step];
    onProgress({
      outcomes: [
        { id:'1', title:'✅ Oui, facile !',  channel_points: p1, users: pu1 },
        { id:'2', title:'❌ Non, trop dur', channel_points: p2, users: pu2 }
      ]
    });
  }, 900);
}

function stopPreviewAnimation() {
  if (state.previewInterval) { clearInterval(state.previewInterval); state.previewInterval = null; }
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
   UTILS
   ================================================================ */

const el          = (id) => document.getElementById(id);
const setText     = (id, v) => { const e = el(id); if (e) e.textContent = v; };
const fmt         = (n) => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'k' : String(n);
const mapOutcomes = (arr) => (arr||[]).map(o => ({ id:o.id, title:o.title, channel_points:o.channel_points||0, users:o.users||0 }));

function clearTimers() {
  stopPreviewAnimation();
  if (state.timerInterval) clearInterval(state.timerInterval);
  if (state.hideTimeout)   clearTimeout(state.hideTimeout);
}
