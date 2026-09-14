// app.js
import { store } from './data.js';
import { computeNextMove, parseNextMove } from './intelligence.js';
import { generateSession } from './training.js';
import { startWalk, stopWalk, getWalkStatus } from './movement.js';
import { searchFoods, lookupBarcode } from './api.js';

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');

function navigateTo(viewId) {
  views.forEach(v => v.classList.remove('active'));
  navItems.forEach(n => n.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  const nav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
  if (nav) nav.classList.add('active');
}

navItems.forEach(btn => {
  btn.addEventListener('click', () => navigateTo(btn.dataset.view));
});

document.querySelectorAll('[data-go]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = 'view-' + btn.dataset.go;
    navigateTo(target);
  });
});

// Oracle panel
const oraclePanel = document.getElementById('oraclePanel');
const oracleBtn = document.getElementById('oracleBtn');
const closeOracle = document.getElementById('closeOracle');
oracleBtn.addEventListener('click', () => oraclePanel.classList.remove('hidden'));
closeOracle.addEventListener('click', () => oraclePanel.classList.add('hidden'));

// Today view
const nmType = document.getElementById('nmType');
const nmTitle = document.getElementById('nmTitle');
const nmMeta = document.getElementById('nmMeta');
const nmAction = document.getElementById('nmAction');

const readinessValue = document.getElementById('readinessValue');
const proteinValue = document.getElementById('proteinValue');
const sleepValue = document.getElementById('sleepValue');
const stepsValue = document.getElementById('stepsValue');

async function renderToday() {
  const s = store.state.today;
  const p = store.state.profile;

  readinessValue.textContent = s.readiness + '%';
  proteinValue.textContent = `${s.protein} / ${p.proteinTarget} g`;
  sleepValue.textContent = s.sleep + ' h';
  stepsValue.textContent = s.steps.toLocaleString();

  nmTitle.textContent = 'Loading recommendation…';
  nmType.textContent = '—';
  nmMeta.textContent = '';

  const text = await computeNextMove();
  const nm = parseNextMove(text);

  nmType.textContent = nm.type;
  nmTitle.textContent = nm.title;
  nmMeta.textContent = nm.meta;
  nmAction.textContent = 'Start ' +
    (nm.type === 'TRAIN' ? 'Session' :
     nm.type === 'FOOD' ? 'Meal' :
     nm.type === 'MOVE' ? 'Walk' : 'Recovery');
}

nmAction.addEventListener('click', () => {
  const type = nmType.textContent;
  if (type === 'TRAIN') navigateTo('view-train');
  else if (type === 'FOOD') navigateTo('view-food');
  else if (type === 'MOVE') navigateTo('view-move');
  else alert('Focus on recovery today: light movement, good sleep, and hitting protein targets.');
});

// Train view
const sessionInfo = document.getElementById('sessionInfo');
const generateSessionBtn = document.getElementById('generateSessionBtn');

generateSessionBtn.addEventListener('click', () => {
  const session = generateSession();
  sessionInfo.textContent = `${session.name}\n\n${session.description}`;
});

// Food view
const foodQuery = document.getElementById('foodQuery');
const foodSearchBtn = document.getElementById('foodSearchBtn');
const foodResults = document.getElementById('foodResults');

foodSearchBtn.addEventListener('click', async () => {
  const q = foodQuery.value.trim();
  if (!q) return;
  foodResults.innerHTML = 'Searching…';
  const foods = await searchFoods(q);
  if (!foods.length) {
    foodResults.innerHTML = 'No results.';
    return;
  }
  foodResults.innerHTML = '';
  foods.slice(0, 8).forEach(f => {
    const div = document.createElement('div');
    div.className = 'food-item';
    const nut = f.nutrition || {};
    div.innerHTML = `
      <strong>${f.food_name}</strong>
      <div>${nut.calories ?? '—'} kcal · P: ${nut.protein ?? '—'}g · C: ${nut.carbohydrate ?? '—'}g · F: ${nut.fat ?? '—'}g</div>
      <button class="btn-primary">Log meal</button>
    `;
    div.querySelector('button').addEventListener('click', () => {
      const meal = {
        name: f.food_name,
        calories: +nut.calories || 0,
        protein: +nut.protein || 0
      };
      store.addMeal(meal);
      renderToday();
      alert('Meal logged.');
    });
    foodResults.appendChild(div);
  });
});

const barcodeInput = document.getElementById('barcodeInput');
const barcodeBtn = document.getElementById('barcodeBtn');
const barcodeResult = document.getElementById('barcodeResult');

barcodeBtn.addEventListener('click', async () => {
  const bc = barcodeInput.value.trim();
  if (!bc) return;
  barcodeResult.innerHTML = 'Looking up…';
  const food = await lookupBarcode(bc);
  if (!food) {
    barcodeResult.innerHTML = 'No product found.';
    return;
  }
  const nut = food.nutrition || {};
  barcodeResult.innerHTML = `
    <div class="food-item">
      <strong>${food.food_name}</strong>
      <div>${nut.calories ?? '—'} kcal · P: ${nut.protein ?? '—'}g · C: ${nut.carbohydrate ?? '—'}g · F: ${nut.fat ?? '—'}g</div>
    </div>
  `;
});

// Move view
const startWalkBtn = document.getElementById('startWalkBtn');
const walkStatus = document.getElementById('walkStatus');
let stopWalkFn = null;

function renderWalkStatus() {
  const w = getWalkStatus();
  if (!w.active) {
    startWalkBtn.textContent = 'Start Walk';
    if (w.elapsed > 0) {
      const mins = Math.floor(w.elapsed / 60);
      walkStatus.textContent = `Last walk: ${mins} minutes.`;
    } else {
      walkStatus.textContent = 'Not started';
    }
    return;
  }
  startWalkBtn.textContent = 'End Walk';
}

startWalkBtn.addEventListener('click', () => {
  if (!store.state.walk.active) {
    stopWalkFn = startWalk(
      (elapsed) => {
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        walkStatus.textContent = `Walking… ${m}:${s.toString().padStart(2, '0')}`;
      },
      (elapsed, addedSteps) => {
        const mins = Math.floor(elapsed / 60);
        walkStatus.textContent = `Walk completed: ${mins} minutes (+${addedSteps.toLocaleString()} steps).`;
        renderWalkStatus();
      }
    );
  } else {
    if (stopWalkFn) stopWalkFn();
    stopWalkFn = null;
    renderWalkStatus();
  }
});

// Progress view
const progressSummary = document.getElementById('progressSummary');
function renderProgress() {
  const s = store.state;
  const meals = s.meals.length;
  const protein = s.today.protein;
  const steps = s.today.steps;
  progressSummary.textContent =
    `Meals logged today: ${meals}\n` +
    `Protein so far: ${protein}g\n` +
    `Steps so far: ${steps.toLocaleString()}\n` +
    `Readiness: ${s.today.readiness}%`;
}

// Oracle chat
const oracleInput = document.getElementById('oracleInput');
const oracleSend = document.getElementById('oracleSend');
const oracleContent = document.getElementById('oracleContent');

oracleSend.addEventListener('click', async () => {
  const q = oracleInput.value.trim();
  if (!q) return;
  oracleInput.value = '';
  oracleContent.textContent = 'Thinking…';

  const s = store.state;
  const text = await computeNextMove(); // reuse, or call oracle directly with question
  oracleContent.textContent = text || 'No response.';
});

// Init
renderToday();
renderProgress();
renderWalkStatus();
