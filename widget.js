/* ==========================================
   Twitch Prediction Overlay – widget.js
   StreamElements Custom Widget
   ========================================== */

'use strict';

/* ---- State ---- */
let predictionState = {
  active: false,
  title: '',
  status: 'active', // active | locked | ended
  outcomes: [],
  endTime: null,
  timerInterval: null,
  hideTimeout: null
};

/* ---- Config depuis les champs SE ---- */
let config = {
  color1: '#5b8af5',
  color2: '#e879f9',
  showTimer: true,
  hideDelay: 8,
  animDuration: 500
};

/* ================================================================
   STREAMELEMENTS EVENTS
   ================================================================ */

window.addEventListener('onWidgetLoad', (obj) => {
  const fieldData = obj.detail.fieldData;
  applyConfig(fieldData);

  // Mock data pour prévisualisation dans l'éditeur SE
  if (fieldData.previewMode === 'true' || fieldData.previewMode === true) {
    showPreview();
  }
});

window.addEventListener('onEventReceived', (obj) => {
  const event = obj.detail;
  const listener = event.listener;
  const data = event.event;

  // Test via SE
  if (listener === 'event:test' && data.type === 'prediction-test') {
    showPreview();
    return;
  }

  switch (listener) {
    case 'prediction-begin':
      handlePredictionBegin(data);
      break;
    case 'prediction-progress':
      handlePredictionProgress(data);
      break;
    case 'prediction-lock':
      handlePredictionLock(data);
      break;
    case 'prediction-end':
      handlePredictionEnd(data);
      break;
  }
});

/* ================================================================
   HANDLERS
   ================================================================ */

function handlePredictionBegin(data) {
  clearTimers();

  predictionState = {
    active: true,
    title: data.title || 'Prédiction',
    status: 'active',
    outcomes: (data.outcomes || []).map(o => ({
      id: o.id,
      title: o.title,
      channel_points: 0,
      users: 0
    })),
    endTime: data.locks_at ? new Date(data.locks_at) : null,
    timerInterval: null,
    hideTimeout: null
  };

  renderWidget();
  showWidget();

  if (config.showTimer && predictionState.endTime) {
    startTimer();
  }
}

function handlePredictionProgress(data) {
  if (!predictionState.active) return;

  predictionState.outcomes = (data.outcomes || []).map(o => ({
    id: o.id,
    title: o.title,
    channel_points: o.channel_points || 0,
    users: o.users || 0
  }));

  updateBars();
  updateStats();
}

function handlePredictionLock(data) {
  if (!predictionState.active) return;

  predictionState.status = 'locked';
  if (data.outcomes) {
    predictionState.outcomes = data.outcomes.map(o => ({
      id: o.id,
      title: o.title,
      channel_points: o.channel_points || 0,
      users: o.users || 0
    }));
  }

  clearTimers();
  updateStatusBadge();
  updateBars();
  updateStats();
}

function handlePredictionEnd(data) {
  if (!predictionState.active) return;

  predictionState.status = 'ended';
  const winnerId = data.winning_outcome_id;

  predictionState.outcomes = (data.outcomes || []).map(o => ({
    id: o.id,
    title: o.title,
    channel_points: o.channel_points || 0,
    users: o.users || 0,
    isWinner: o.id === winnerId
  }));

  clearTimers();
  renderResult();
  updateStatusBadge();
  updateBars();
  updateStats();

  // Masquer après hideDelay secondes
  predictionState.hideTimeout = setTimeout(() => {
    hideWidget();
  }, config.hideDelay * 1000);
}

/* ================================================================
   RENDER
   ================================================================ */

function renderWidget() {
  const el = (id) => document.getElementById(id);

  el('prediction-title').textContent = predictionState.title;

  const outcomes = predictionState.outcomes;
  if (outcomes[0]) {
    el('option-1-title').textContent = outcomes[0].title;
  }
  if (outcomes[1]) {
    el('option-2-title').textContent = outcomes[1].title;
  }

  // Reset badges
  el('option-1-badge').className = 'option-badge';
  el('option-2-badge').className = 'option-badge';
  el('option-1-badge').textContent = '';
  el('option-2-badge').textContent = '';

  // Reset states
  document.getElementById('option-1').className = 'option option-1';
  document.getElementById('option-2').className = 'option option-2';

  updateStatusBadge();
  updateBars();
  updateStats();
}

function renderResult() {
  const outcomes = predictionState.outcomes;

  outcomes.forEach((outcome, index) => {
    const num = index + 1;
    const card = document.getElementById(`option-${num}`);
    const badge = document.getElementById(`option-${num}-badge`);

    if (!card || !badge) return;

    if (outcome.isWinner) {
      card.className = `option option-${num} winner`;
      badge.className = 'option-badge winner-badge';
      badge.textContent = '🏆 Gagnant';
    } else {
      card.className = `option option-${num} loser`;
      badge.className = 'option-badge loser-badge';
      badge.textContent = 'Perdant';
    }
  });
}

function updateBars() {
  const outcomes = predictionState.outcomes;
  const total = outcomes.reduce((acc, o) => acc + (o.channel_points || 0), 0);

  outcomes.forEach((outcome, index) => {
    const num = index + 1;
    const bar = document.getElementById(`option-${num}-bar`);
    if (!bar) return;
    const pct = total > 0 ? Math.round((outcome.channel_points / total) * 100) : 50;
    bar.style.width = `${pct}%`;
  });
}

function updateStats() {
  const outcomes = predictionState.outcomes;
  const total = outcomes.reduce((acc, o) => acc + (o.channel_points || 0), 0);
  const totalUsers = outcomes.reduce((acc, o) => acc + (o.users || 0), 0);

  outcomes.forEach((outcome, index) => {
    const num = index + 1;
    const points = outcome.channel_points || 0;
    const pct = total > 0 ? Math.round((points / total) * 100) : 50;

    const el = (id) => document.getElementById(id);
    if (el(`option-${num}-points`)) el(`option-${num}-points`).textContent = formatNumber(points);
    if (el(`option-${num}-users`))  el(`option-${num}-users`).textContent = formatNumber(outcome.users || 0);
    if (el(`option-${num}-percent`)) el(`option-${num}-percent`).textContent = `${pct}%`;
  });

  const totalEl = document.getElementById('total-points');
  const usersEl = document.getElementById('total-users');
  if (totalEl) totalEl.textContent = formatNumber(total);
  if (usersEl) usersEl.textContent = formatNumber(totalUsers);
}

function updateStatusBadge() {
  const badge = document.getElementById('status-badge');
  if (!badge) return;

  const map = {
    active: { text: 'EN COURS', cls: 'active' },
    locked: { text: 'VERROUILLÉ', cls: 'locked' },
    ended: { text: 'TERMINÉ', cls: 'ended' }
  };

  const s = map[predictionState.status] || map.active;
  badge.textContent = s.text;
  badge.className = `status-badge ${s.cls}`;
}

/* ================================================================
   TIMER
   ================================================================ */

function startTimer() {
  const container = document.getElementById('timer-container');
  const display = document.getElementById('timer-display');
  if (!container || !display) return;

  predictionState.timerInterval = setInterval(() => {
    const now = new Date();
    const diff = Math.max(0, Math.floor((predictionState.endTime - now) / 1000));

    display.textContent = formatTime(diff);

    if (diff <= 10) {
      container.classList.add('urgent');
    } else {
      container.classList.remove('urgent');
    }

    if (diff === 0) {
      clearInterval(predictionState.timerInterval);
    }
  }, 1000);
}

function formatTime(seconds) {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

/* ================================================================
   SHOW / HIDE
   ================================================================ */

function showWidget() {
  const widget = document.getElementById('prediction-widget');
  widget.classList.remove('hidden', 'leaving');
  widget.classList.add('entering');
  setTimeout(() => widget.classList.remove('entering'), config.animDuration + 100);
}

function hideWidget() {
  const widget = document.getElementById('prediction-widget');
  widget.classList.add('leaving');
  setTimeout(() => {
    widget.classList.add('hidden');
    widget.classList.remove('leaving');
    predictionState.active = false;
  }, config.animDuration);
}

/* ================================================================
   CONFIG
   ================================================================ */

function applyConfig(fieldData) {
  if (fieldData.color1) config.color1 = fieldData.color1;
  if (fieldData.color2) config.color2 = fieldData.color2;
  if (fieldData.showTimer !== undefined) config.showTimer = fieldData.showTimer === 'true' || fieldData.showTimer === true;
  if (fieldData.hideDelay) config.hideDelay = parseInt(fieldData.hideDelay, 10) || 8;

  // Appliquer les couleurs en CSS variables
  const root = document.documentElement;
  root.style.setProperty('--color-option1', config.color1);
  root.style.setProperty('--color-option2', config.color2);

  // Glow dynamique
  const hex2rgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  };
  try {
    root.style.setProperty('--color-option1-glow', hex2rgba(config.color1, 0.3));
    root.style.setProperty('--color-option2-glow', hex2rgba(config.color2, 0.3));
  } catch(e) {}

  // Timer hidden if disabled
  if (!config.showTimer) {
    const tc = document.getElementById('timer-container');
    if (tc) tc.style.display = 'none';
  }
}

/* ================================================================
   PREVIEW / TEST
   ================================================================ */

function showPreview() {
  handlePredictionBegin({
    title: 'Ce run se termine-t-il en moins de 30 min ?',
    locks_at: new Date(Date.now() + 60000).toISOString(),
    outcomes: [
      { id: '1', title: '✅ Oui, facile !' },
      { id: '2', title: '❌ Non, trop dur' }
    ]
  });

  setTimeout(() => {
    handlePredictionProgress({
      outcomes: [
        { id: '1', title: '✅ Oui, facile !', channel_points: 12450, users: 87 },
        { id: '2', title: '❌ Non, trop dur', channel_points: 8200, users: 53 }
      ]
    });
  }, 600);
}

/* ================================================================
   UTILS
   ================================================================ */

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n.toString();
}

function clearTimers() {
  if (predictionState.timerInterval) clearInterval(predictionState.timerInterval);
  if (predictionState.hideTimeout) clearTimeout(predictionState.hideTimeout);
}
