/**
 * AXIS — Main Application
 * Adaptive AI Fitness Operating System
 *
 * Full source is also available at the project sandbox path.
 * This commit adds the complete app.js orchestrator.
 */

// Simple state
const state = {
  profile: {
    name: 'You',
    goal: 'general fitness',
    proteinTarget: 140
  },
  today: {
    readiness: 70,
    protein: 95,
    sleep: 7.2,
    steps: 4200,
    lastWorkoutDaysAgo: 2,
    consistency: 0.6
  },
  meals: [],
  walk: {
    active: false,
    start: null,
    elapsed: 0
  }
};

// Tabs
const tabs = document.querySelectorAll('.top-nav button');
const sections = document.querySelectorAll('.tab');

tabs.forEach(btn => {
  btn.addEventListener('click', () => {
    tabs.forEach(b => b.classList.remove('active'));
    sections.forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// Oracle panel
const oraclePanel = document.getElementById('oraclePanel');
const oracleToggle = document.getElementById('oracleToggle');
const closeOracle = document.getElementById('closeOracle');

oracleToggle.addEventListener('click', () => oraclePanel.classList.remove('hidden'));
closeOracle.addEventListener('click', () => oraclePanel.classList.add('hidden'));

// Today: render and "Next Move"
const nmType = document.getElementById('nmType');
const nmTitle = document.getElementById('nmTitle');
const nmMeta = document.getElementById('nmMeta');
const nmAction = document.getElementById('nmAction');

const readinessValue = document.getElementById('readinessValue');
const proteinValue = document.getElementById('proteinValue');
const sleepValue = document.getElementById('sleepValue');
const stepsValue = document.getElementById('stepsValue');

async function computeNextMove() {
  try {
    const res = await fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userState: {
          readiness: state.today.readiness,
          protein: state.today.protein,
          proteinTarget: state.profile.proteinTarget,
          sleep: state.today.sleep,
          lastWorkout: state.today.lastWorkoutDaysAgo,
          consistency: Math.round(state.today.consistency * 100),
          goal: state.profile.goal
        }
      })
    });

    if (!res.ok) throw new Error('Oracle unavailable');
    const data = await res.json();
    return data.analysis || 'No recommendation.';
  } catch {
    // Fallback local heuristic
    const s = state.today;
    if (s.readiness < 50) {
      return 'RECOVER\nTake an easy 15–20 minute walk and focus on hydration and sleep tonight.';
    }
    if (s.protein < state.profile.proteinTarget * 0.6) {
      return 'FOOD\nYour protein is low for today. Build a high-protein meal or snack.';
    }
    if (s.lastWorkoutDaysAgo >= 2) {
      return 'TRAIN\nYou’re ready for a session. Do a moderate full-body or upper/lower workout.';
    }
    return 'MOVE\nYou’re close to your movement target. Add a short walk to finish strong.';
  }
}

function parseNextMove(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const type = (lines[0] || 'TRAIN').toUpperCase();
  const title = lines[1] || 'Recommended action';
  const meta = lines.slice(2).join(' ') || '';
  return { type, title, meta };
}

async function renderToday() {
  readinessValue.textContent = state.today.readiness + '%';
  proteinValue.textContent = state.today.protein + ' / ' + state.profile.proteinTarget + ' g';
  sleepValue.textContent = state.today.sleep + ' h';
  stepsValue.textContent = state.today.steps.toLocaleString();

  const analysis = await computeNextMove();
  const nm = parseNextMove(analysis);

  nmType.textContent = nm.type;
  nmTitle.textContent = nm.title;
  nmMeta.textContent = nm.meta;
  nmAction.textContent = 'Start ' + (nm.type === 'TRAIN' ? 'Session' : nm.type === 'FOOD' ? 'Meal' : nm.type === 'MOVE' ? 'Walk' : 'Recovery');
}

nmAction.addEventListener('click', () => {
  const type = nmType.textContent;
  if (type === 'TRAIN') {
    document.querySelector('[data-tab="train"]').click();
  } else if (type === 'FOOD') {
    document.querySelector('[data-tab="food"]').click();
  } else if (type === 'MOVE') {
    document.querySelector('[data-tab="move"]').click();
  } else {
    alert('Focus on recovery today: light movement, good sleep, and hitting protein targets.');
  }
});

// Train: simple session generator (local heuristic for now)
const sessionInfo = document.getElementById('sessionInfo');
const generateSessionBtn = document.getElementById('generateSessionBtn');

generateSessionBtn.addEventListener('click', () => {
  const readiness = state.today.readiness;
  let session = '';
  if (readiness >= 70) {
    session = 'Moderate Full-Body\n- Squat pattern: 3×8–10\n- Push: 3×8–12\n- Pull: 3×8–12\n- Hinge: 3×8–10\n- Core: 2–3 sets';
  } else if (readiness >= 40) {
    session = 'Light Full-Body\n- Bodyweight squat: 2×12–15\n- Push-ups or incline push: 2×8–12\n- Band or DB row: 2×10–15\n- Hip hinge (light): 2×10–12\n- Easy core + mobility';
  } else {
    session = 'Recovery Movement\n- 15–20 min easy walk\n- Gentle mobility for hips, thoracic spine, shoulders';
  }
  sessionInfo.textContent = session;
});

// Food: search + barcode
const foodQuery = document.getElementById('foodQuery');
const foodSearchBtn = document.getElementById('foodSearchBtn');
const foodResults = document.getElementById('foodResults');

foodSearchBtn.addEventListener('click', async () => {
  const q = foodQuery.value.trim();
  if (!q) return;
  foodResults.innerHTML = 'Searching…';
  try {
    const res = await fetch(`/api/food?mode=search&query=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!data.foods?.food?.length) {
      foodResults.innerHTML = 'No results.';
      return;
    }
    foodResults.innerHTML = '';
    data.foods.food.slice(0, 8).forEach(f => {
      const div = document.createElement('div');
      div.className = 'food-item';
      const nut = f.nutrition || {};
      div.innerHTML = `
        <strong>${f.food_name}</strong>
        <div>${nut.calories ?? '—'} kcal · P: ${nut.protein ?? '—'}g · C: ${nut.carbohydrate ?? '—'}g · F: ${nut.fat ?? '—'}g</div>
        <button class="primary-btn" data-food-id="${f.food_id}">Log meal</button>
      `;
      div.querySelector('button').addEventListener('click', () => {
        state.meals.push({ name: f.food_name, calories: +nut.calories || 0, protein: +nut.protein || 0 });
        state.today.protein += +nut.protein || 0;
        renderToday();
        alert('Meal logged (demo).');
      });
      foodResults.appendChild(div);
    });
  } catch (e) {
    foodResults.innerHTML = 'Search failed.';
  }
});

const barcodeInput = document.getElementById('barcodeInput');
const barcodeBtn = document.getElementById('barcodeBtn');
const barcodeResult = document.getElementById('barcodeResult');

barcodeBtn.addEventListener('click', async () => {
  const bc = barcodeInput.value.trim();
  if (!bc) return;
  barcodeResult.textContent = 'Looking up…';
  try {
    const res = await fetch(`/api/food?mode=barcode&barcode=${encodeURIComponent(bc)}`);
    const data = await res.json();
    if (!data.foods?.food?.length) {
      barcodeResult.textContent = 'No product found.';
      return;
    }
    const f = data.foods.food[0];
    const nut = f.nutrition || {};
    barcodeResult.innerHTML = `
      <div class="food-item">
        <strong>${f.food_name}</strong>
        <div>${nut.calories ?? '—'} kcal · P: ${nut.protein ?? '—'}g · C: ${nut.carbohydrate ?? '—'}g · F: ${nut.fat ?? '—'}g</div>
      </div>
    `;
  } catch {
    barcodeResult.textContent = 'Lookup failed.';
  }
});

// Move: simple walk timer
const startWalkBtn = document.getElementById('startWalkBtn');
const walkStatus = document.getElementById('walkStatus');
let walkTimer = null;

startWalkBtn.addEventListener('click', () => {
  if (!state.walk.active) {
    state.walk.active = true;
    state.walk.start = Date.now();
    walkStatus.textContent = 'Walking…';
    walkTimer = setInterval(() => {
      state.walk.elapsed = Math.floor((Date.now() - state.walk.start) / 1000);
      const m = Math.floor(state.walk.elapsed / 60);
      const s = state.walk.elapsed % 60;
      walkStatus.textContent = `Walking… ${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
    startWalkBtn.textContent = 'End Walk';
  } else {
    clearInterval(walkTimer);
    state.walk.active = false;
    const mins = Math.floor(state.walk.elapsed / 60);
    walkStatus.textContent = `Walk completed: ${mins} minutes.`;
    startWalkBtn.textContent = 'Start Walk';
    // Simple heuristic: add some steps
    state.today.steps += Math.floor(mins * 90);
    renderToday();
  }
});

// Progress: simple summary
const progressSummary = document.getElementById('progressSummary');
function renderProgress() {
  const meals = state.meals.length;
  const protein = state.today.protein;
  const steps = state.today.steps;
  progressSummary.textContent =
    `Meals logged today: ${meals}\n` +
    `Protein so far: ${protein}g\n` +
    `Steps so far: ${steps.toLocaleString()}\n` +
    `Readiness: ${state.today.readiness}%`;
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

  try {
    const res = await fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userState: {
          readiness: state.today.readiness,
          protein: state.today.protein,
          proteinTarget: state.profile.proteinTarget,
          sleep: state.today.sleep,
          lastWorkout: state.today.lastWorkoutDaysAgo,
          consistency: Math.round(state.today.consistency * 100),
          goal: state.profile.goal,
          question: q
        }
      })
    });
    const data = await res.json();
    oracleContent.textContent = data.analysis || 'No response.';
  } catch {
    oracleContent.textContent = 'Oracle is offline. Using local guidance.';
  }
});

// Init
renderToday();
renderProgress();
