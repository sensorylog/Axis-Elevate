/**
 * AXIS — Main Application
 * Adaptive AI Fitness Operating System
 *
 * Full source is also available at the project sandbox path.
 * This commit adds the complete app.js orchestrator.
 */

import { getState, setState, updateProfile, subscribe, generateId, getTodayNutrition, getProteinTarget, logRecovery, addJournalEntry, addWorkout } from "./data.js";
import { decideNextMove, computeReadiness, getReadinessLabel, detectBottleneck } from "./intelligence.js";
import { generateSession, startWorkoutFromNextMove, getExercise, EXERCISE_DB } from "./training.js";
import { logSet } from "./data.js";
import { searchFoods, getFoodDetail, analyzeFoodImage, logFoodFromDetail, logEstimatedMeal, getDailyNutritionSummary } from "./food.js";
import { getTodayMovement, getStepTarget, startWalk, stopWalk, getActiveWalk, logManualSteps } from "./movement.js";
import { askOracle } from "./api.js";

let currentScreen = "today";
let activeSession = null;
let currentNextMove = null;

function boot() {
  const s = getState();
  if (!s.onboarded) {
    showOnboarding();
  } else {
    showScreen("today");
    refreshToday();
  }
  bindNav();
  bindOracle();
  bindSheet();
  subscribe(() => {
    if (currentScreen === "today") refreshToday();
  });
}

function bindNav() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => {
      showScreen(btn.dataset.screen);
    });
  });
}

function showScreen(name) {
  currentScreen = name;
  document.querySelectorAll(".screen").forEach(el => el.classList.add("hidden"));
  const el = document.getElementById(`screen-${name}`);
  if (el) el.classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(b => {
    b.classList.toggle("active", b.dataset.screen === name);
  });
  const nav = document.getElementById("bottom-nav");
  const fab = document.getElementById("oracle-fab");
  if (name === "onboard") {
    nav.style.display = "none";
    fab.style.display = "none";
  } else {
    nav.style.display = "flex";
    fab.style.display = "flex";
  }
  if (name === "today") refreshToday();
  if (name === "train") renderTrain();
  if (name === "food") renderFood();
  if (name === "move") renderMove();
  if (name === "progress") renderProgress();
}

function refreshToday() {
  const s = getState();
  const name = s.profile.name || "there";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  document.getElementById("greeting").textContent = `${greet}, ${name.split(" ")[0]}`;
  const readiness = computeReadiness();
  const { label, tone } = getReadinessLabel(readiness);
  const pill = document.getElementById("readiness-pill");
  pill.textContent = `${label} · ${readiness}%`;
  pill.className = `pill ${tone}`;
  currentNextMove = decideNextMove();
  const nm = currentNextMove;
  document.getElementById("nm-type").textContent = nm.type;
  document.getElementById("nm-title").textContent = nm.title;
  document.getElementById("nm-subtitle").textContent = nm.subtitle;
  document.getElementById("nm-reason").textContent = nm.reason;
  const actionBtn = document.getElementById("nm-action");
  actionBtn.textContent = nm.actionLabel;
  actionBtn.onclick = () => handleNextMoveAction(nm);
  const nut = getDailyNutritionSummary();
  document.getElementById("nut-protein").textContent = `${Math.round(nut.protein)}g`;
  document.getElementById("nut-cal").textContent = Math.round(nut.calories);
  document.getElementById("nut-summary").textContent = `${nut.proteinPct}% of protein target`;
  document.getElementById("nut-bar").style.width = `${nut.proteinPct}%`;
  const mov = getTodayMovement();
  const target = getStepTarget();
  document.getElementById("move-steps").textContent = (mov.steps || 0).toLocaleString();
  document.getElementById("move-target").textContent = target.toLocaleString();
  document.getElementById("move-source").textContent = mov.source === "none" ? "No data yet" : mov.source;
  const pct = Math.min(100, Math.round(((mov.steps || 0) / target) * 100));
  document.getElementById("move-bar").style.width = `${pct}%`;
}

function handleNextMoveAction(nm) {
  if (nm.action === "start_workout") {
    activeSession = startWorkoutFromNextMove(nm);
    showScreen("train");
    renderActiveWorkout();
  } else if (nm.action === "start_walk") {
    showScreen("move");
    beginWalkUI(nm.meta?.durationMin || 20);
  } else if (nm.action === "open_food") {
    showScreen("food");
  } else if (nm.action === "open_progress") {
    showScreen("progress");
  }
}

const ONBOARD_STEPS = [
  { id: "welcome", title: "Welcome to AXIS", subtitle: "An adaptive system that decides what you should do next." },
  { id: "name", title: "What should we call you?", fields: ["name"] },
  { id: "body", title: "Body metrics", fields: ["age", "sex", "heightCm", "weightKg"] },
  { id: "goal", title: "Primary goal", chips: ["fat_loss", "muscle_gain", "strength", "fitness", "general"] },
  { id: "experience", title: "Training experience", chips: ["beginner", "intermediate", "advanced"] },
  { id: "schedule", title: "Training schedule", fields: ["trainingDaysPerWeek", "sessionDurationMin"] },
  { id: "environment", title: "Where do you train?", chips: ["gym", "home", "outdoors", "mixed"] },
  { id: "activity", title: "Daily activity level", chips: ["sedentary", "lightly_active", "moderately_active", "highly_active"] },
  { id: "done", title: "Building your AXIS", subtitle: "We generate an initial plan from everything you shared." }
];

let onboardIdx = 0;
let onboardData = {};

function showOnboarding() {
  document.getElementById("screen-onboard").classList.remove("hidden");
  document.getElementById("bottom-nav").style.display = "none";
  document.getElementById("oracle-fab").style.display = "none";
  currentScreen = "onboard";
  renderOnboardStep();
}

function renderOnboardStep() {
  const step = ONBOARD_STEPS[onboardIdx];
  const container = document.getElementById("onboard-container");
  let html = `<div class="onboard-step active">`;
  html += `<div class="label mb-8">Step ${onboardIdx + 1} of ${ONBOARD_STEPS.length}</div>`;
  html += `<h1 class="display mb-8">${step.title}</h1>`;
  if (step.subtitle) html += `<p class="muted mb-24">${step.subtitle}</p>`;
  if (step.id === "welcome") {
    html += `<p class="muted mb-24">AXIS continuously combines your profile, training, food, movement and recovery to answer one question: <strong>What should I do next?</strong></p>`;
    html += `<button class="btn btn-primary btn-block" id="ob-next">Get started</button>`;
  } else if (step.id === "name") {
    html += `<div class="field"><label>Name</label><input id="ob-name" placeholder="Your name" value="${onboardData.name || ""}" /></div>`;
    html += `<button class="btn btn-primary btn-block" id="ob-next">Continue</button>`;
  } else if (step.id === "body") {
    html += `<div class="field"><label>Age</label><input type="number" id="ob-age" min="14" max="90" value="${onboardData.age || ""}" /></div>
      <div class="field"><label>Sex</label><div class="chip-group" id="ob-sex">
          <button class="chip ${onboardData.sex==='male'?'selected':''}" data-v="male">Male</button>
          <button class="chip ${onboardData.sex==='female'?'selected':''}" data-v="female">Female</button>
          <button class="chip ${onboardData.sex==='other'?'selected':''}" data-v="other">Other</button>
        </div></div>
      <div class="field"><label>Height (cm)</label><input type="number" id="ob-height" min="120" max="230" value="${onboardData.heightCm || ""}" /></div>
      <div class="field"><label>Weight (kg)</label><input type="number" id="ob-weight" min="35" max="250" step="0.1" value="${onboardData.weightKg || ""}" /></div>
      <button class="btn btn-primary btn-block" id="ob-next">Continue</button>`;
  } else if (step.chips) {
    const labels = { fat_loss: "Fat loss", muscle_gain: "Muscle gain", strength: "Strength", fitness: "Fitness", general: "General health", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced", gym: "Gym", home: "Home", outdoors: "Outdoors", mixed: "Mixed", sedentary: "Sedentary", lightly_active: "Lightly active", moderately_active: "Moderately active", highly_active: "Highly active" };
    html += `<div class="chip-group mb-24" id="ob-chips">`;
    step.chips.forEach(c => {
      html += `<button class="chip ${onboardData[step.id] === c ? "selected" : ""}" data-v="${c}">${labels[c] || c}</button>`;
    });
    html += `</div><button class="btn btn-primary btn-block" id="ob-next" ${!onboardData[step.id] ? "disabled" : ""}>Continue</button>`;
  } else if (step.id === "schedule") {
    html += `<div class="field"><label>Days per week</label><select id="ob-days"><option value="2">2</option><option value="3" selected>3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option></select></div>
      <div class="field"><label>Session length (minutes)</label><select id="ob-duration"><option value="30">30</option><option value="45" selected>45</option><option value="60">60</option><option value="75">75</option></select></div>
      <button class="btn btn-primary btn-block" id="ob-next">Continue</button>`;
  } else if (step.id === "done") {
    html += `<p class="muted mb-24">AXIS will adapt every recommendation as you train, eat, move and recover.</p>`;
    html += `<button class="btn btn-primary btn-block" id="ob-finish">Build my AXIS</button>`;
  }
  html += `</div>`;
  container.innerHTML = html;
  const nextBtn = document.getElementById("ob-next");
  if (nextBtn) nextBtn.addEventListener("click", advanceOnboard);
  document.querySelectorAll("#ob-sex .chip, #ob-chips .chip").forEach(chip => {
    chip.addEventListener("click", () => {
      chip.parentElement.querySelectorAll(".chip").forEach(c => c.classList.remove("selected"));
      chip.classList.add("selected");
      const key = step.id === "body" ? "sex" : step.id;
      onboardData[key] = chip.dataset.v;
      const n = document.getElementById("ob-next");
      if (n) n.disabled = false;
    });
  });
  const finish = document.getElementById("ob-finish");
  if (finish) finish.addEventListener("click", completeOnboarding);
}

function advanceOnboard() {
  const step = ONBOARD_STEPS[onboardIdx];
  if (step.id === "name") {
    const v = document.getElementById("ob-name")?.value?.trim();
    if (!v) return;
    onboardData.name = v;
  }
  if (step.id === "body") {
    onboardData.age = parseInt(document.getElementById("ob-age")?.value, 10) || null;
    onboardData.heightCm = parseFloat(document.getElementById("ob-height")?.value) || null;
    onboardData.weightKg = parseFloat(document.getElementById("ob-weight")?.value) || null;
    if (!onboardData.sex) return;
  }
  if (step.id === "schedule") {
    onboardData.trainingDaysPerWeek = parseInt(document.getElementById("ob-days")?.value, 10);
    onboardData.sessionDurationMin = parseInt(document.getElementById("ob-duration")?.value, 10);
  }
  if (step.chips && !onboardData[step.id] && step.id !== "body") return;
  onboardIdx++;
  if (onboardIdx >= ONBOARD_STEPS.length) return;
  renderOnboardStep();
}

function completeOnboarding() {
  updateProfile({
    id: generateId("user"),
    name: onboardData.name || "Athlete",
    age: onboardData.age,
    sex: onboardData.sex,
    heightCm: onboardData.heightCm,
    weightKg: onboardData.weightKg,
    goal: onboardData.goal || "fitness",
    experience: onboardData.experience || "intermediate",
    trainingDaysPerWeek: onboardData.trainingDaysPerWeek || 3,
    sessionDurationMin: onboardData.sessionDurationMin || 45,
    environment: onboardData.environment || "mixed",
    activityLevel: onboardData.activity || "moderately_active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  setState(s => ({ ...s, onboarded: true }));
  document.getElementById("screen-onboard").classList.add("hidden");
  showScreen("today");
}

function renderTrain() {
  const el = document.getElementById("train-content");
  if (activeSession) { renderActiveWorkout(); return; }
  const s = getState();
  el.innerHTML = `<div class="glass card mb-16"><div class="card-title">Generate a session</div>
    <p class="tiny mb-12">AXIS adapts focus, volume and intensity to your readiness and equipment.</p>
    <div class="chip-group mb-12" id="focus-chips">${["Full Body","Upper Body","Lower Body","Push","Pull"].map(f => `<button class="chip" data-f="${f}">${f}</button>`).join("")}</div>
    <div class="chip-group mb-16" id="mode-chips">${["normal","low_energy","20_minute","home","recovery"].map(m => `<button class="chip ${m==='normal'?'selected':''}" data-m="${m}">${m.replace("_"," ")}</button>`).join("")}</div>
    <button class="btn btn-primary btn-block" id="gen-session">Generate session</button></div>
    <div class="glass card"><div class="card-title">Recent sessions</div><div id="recent-workouts" class="mt-8"></div></div>`;
  let selectedFocus = "Full Body", selectedMode = "normal";
  document.querySelectorAll("#focus-chips .chip").forEach(c => { c.addEventListener("click", () => { document.querySelectorAll("#focus-chips .chip").forEach(x => x.classList.remove("selected")); c.classList.add("selected"); selectedFocus = c.dataset.f; }); });
  document.querySelectorAll("#mode-chips .chip").forEach(c => { c.addEventListener("click", () => { document.querySelectorAll("#mode-chips .chip").forEach(x => x.classList.remove("selected")); c.classList.add("selected"); selectedMode = c.dataset.m; }); });
  document.getElementById("gen-session").onclick = () => {
    activeSession = generateSession({ focus: selectedFocus, mode: selectedMode, durationMin: s.profile.sessionDurationMin || 45, equipment: s.profile.equipment || [], experience: s.profile.experience || "intermediate", goal: s.profile.goal });
    renderActiveWorkout();
  };
  const recent = (s.workouts || []).slice(0, 5);
  const list = document.getElementById("recent-workouts");
  if (!recent.length) list.innerHTML = `<p class="tiny">No sessions logged yet.</p>`;
  else list.innerHTML = recent.map(w => `<div class="list-item"><div><div class="card-title">${w.focus || "Session"}</div><div class="tiny">${new Date(w.createdAt).toLocaleDateString()} · ${w.exercises?.length || 0} exercises</div></div></div>`).join("");
}

function renderActiveWorkout() {
  const el = document.getElementById("train-content");
  if (!activeSession) return;
  let html = `<div class="flex-between mb-16"><div><div class="label">${activeSession.mode} · ${activeSession.durationMin} min</div><h2 class="display" style="font-size:1.4rem">${activeSession.focus}</h2></div><button class="btn btn-secondary" id="end-workout">End</button></div>
    <div class="glass card mb-12"><div class="tiny mb-8">Warm-up</div><ul class="tiny" style="padding-left:16px">${(activeSession.warmup||[]).map(w=>`<li>${w}</li>`).join("")}</ul></div>`;
  activeSession.exercises.forEach((ex, idx) => {
    html += `<div class="glass card mb-12" data-ex="${idx}"><div class="card-title">${ex.name}</div><div class="tiny mb-8">${ex.sets} sets · ${ex.repRange[0]}–${ex.repRange[1]} ${ex.isTimeBased ? "sec" : "reps"} · RPE ~${ex.rpeTarget}</div><div id="sets-${idx}">${Array.from({length: ex.sets}, (_, i) => `<div class="set-row"><span class="tiny">${i+1}</span><input type="number" placeholder="kg" data-set="${i}" data-field="load" /><input type="number" placeholder="reps" data-set="${i}" data-field="reps" /><input type="number" placeholder="RPE" min="1" max="10" data-set="${i}" data-field="rpe" /><button class="btn btn-secondary" style="padding:8px 12px" data-log="${idx}-${i}">✓</button></div>`).join("")}</div><p class="tiny mt-8">${ex.notes || ""}</p></div>`;
  });
  html += `<button class="btn btn-primary btn-block mt-16" id="finish-workout">Complete session</button>`;
  el.innerHTML = html;
  document.getElementById("end-workout").onclick = () => { if (confirm("End session without saving?")) { activeSession = null; renderTrain(); } };
  document.getElementById("finish-workout").onclick = finishWorkout;
  el.querySelectorAll("[data-log]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [exIdx, setIdx] = btn.dataset.log.split("-").map(Number);
      const card = el.querySelector(`[data-ex="${exIdx}"]`);
      const load = parseFloat(card.querySelector(`[data-set="${setIdx}"][data-field="load"]`)?.value) || 0;
      const reps = parseInt(card.querySelector(`[data-set="${setIdx}"][data-field="reps"]`)?.value, 10) || 0;
      const rpe = parseFloat(card.querySelector(`[data-set="${setIdx}"][data-field="rpe"]`)?.value) || null;
      if (!activeSession.exercises[exIdx].completedSets) activeSession.exercises[exIdx].completedSets = [];
      activeSession.exercises[exIdx].completedSets[setIdx] = { load, reps, rpe, timestamp: new Date().toISOString() };
      btn.textContent = "✓";
      btn.style.background = "rgba(93,222,165,0.25)";
    });
  });
}

function finishWorkout() {
  if (!activeSession) return;
  addWorkout({ focus: activeSession.focus, mode: activeSession.mode, durationMin: activeSession.durationMin, exercises: activeSession.exercises, date: new Date().toISOString().slice(0, 10) });
  activeSession = null;
  alert("Session saved. AXIS will adapt future recommendations.");
  renderTrain();
  refreshToday();
}

function renderFood() {
  const el = document.getElementById("food-content");
  const summary = getDailyNutritionSummary();
  el.innerHTML = `<div class="glass card mb-16"><div class="flex-between"><div class="card-title">Today</div><span class="tiny">${summary.proteinPct}% protein</span></div>
    <div class="stat-row"><div><div class="stat-value">${Math.round(summary.protein)}g</div><div class="stat-label">Protein / ${summary.proteinTarget}g</div></div>
    <div style="text-align:right"><div class="stat-value">${Math.round(summary.calories)}</div><div class="stat-label">kcal</div></div></div>
    <div class="bar-track mt-8"><div class="bar-fill" style="width:${summary.proteinPct}%"></div></div></div>
    <div class="glass card mb-16"><div class="card-title mb-12">Search foods</div><input id="food-search" placeholder="sushi, jollof, chicken, biryani…" /><div id="food-results" class="mt-12"></div></div>
    <div class="glass card mb-16"><div class="card-title mb-12">Food Vision</div><p class="tiny mb-12">Take or upload a photo. AXIS identifies foods and estimates portions.</p><input type="file" id="food-photo" accept="image/*" capture="environment" class="mb-12" /><div id="vision-result"></div></div>
    <div class="glass card"><div class="card-title">Logged today</div><div id="meal-list" class="mt-8"></div></div>`;
  let searchTimer;
  document.getElementById("food-search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (q.length < 2) { document.getElementById("food-results").innerHTML = ""; return; }
    searchTimer = setTimeout(async () => {
      document.getElementById("food-results").innerHTML = `<div class="spinner"></div>`;
      const result = await searchFoods(q);
      if (result.error) { document.getElementById("food-results").innerHTML = `<p class="tiny">${result.error}</p>`; return; }
      const items = Array.isArray(result) ? result : (result.items || []);
      if (!items.length) { document.getElementById("food-results").innerHTML = `<p class="tiny">No results. Try another term.</p>`; return; }
      document.getElementById("food-results").innerHTML = items.map(f => `<div class="list-item" data-fid="${f.food_id}"><div><div class="card-title">${f.food_name}</div><div class="tiny">${f.brand_name || f.food_type || ""}</div></div></div>`).join("");
      document.querySelectorAll("#food-results .list-item").forEach(item => { item.addEventListener("click", () => openFoodDetail(item.dataset.fid)); });
    }, 350);
  });
  document.getElementById("food-photo").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resultEl = document.getElementById("vision-result");
    resultEl.innerHTML = `<div class="flex gap-8"><div class="spinner"></div><span class="tiny">Analyzing…</span></div>`;
    const reader = new FileReader();
    reader.onload = async () => {
      const vision = await analyzeFoodImage(reader.result, file.type || "image/jpeg");
      if (vision.error) { resultEl.innerHTML = `<p class="tiny">${vision.error}</p>`; return; }
      const items = vision.items || [];
      if (!items.length) { resultEl.innerHTML = `<p class="tiny">${vision.scene_description || "No food clearly identified."}</p>`; return; }
      resultEl.innerHTML = items.map((it, i) => `<div class="list-item"><div style="flex:1"><div class="card-title">${it.name} <span class="tiny">${Math.round((it.confidence||0)*100)}%</span></div><div class="tiny">${(it.likely_preparations||[]).join(" / ") || ""} · ${it.estimated_portion || ""}</div></div><button class="btn btn-secondary" style="padding:8px 14px" data-vision-log="${i}">Log</button></div>`).join("");
      resultEl.querySelectorAll("[data-vision-log]").forEach(btn => {
        btn.addEventListener("click", () => {
          const it = items[parseInt(btn.dataset.visionLog, 10)];
          logEstimatedMeal({ name: it.name, calories: it.estimated_portion === "large" ? 450 : it.estimated_portion === "small" ? 180 : 300, protein: 15, carbs: 30, fat: 12, confidence: "estimated", source: "vision" });
          alert(`Logged estimate for ${it.name}. Refine with search for accuracy.`);
          renderFood();
        });
      });
    };
    reader.readAsDataURL(file);
  });
  const meals = getState().meals.filter(m => m.date === new Date().toISOString().slice(0, 10));
  const list = document.getElementById("meal-list");
  if (!meals.length) list.innerHTML = `<p class="tiny">No meals logged yet.</p>`;
  else list.innerHTML = meals.map(m => `<div class="list-item"><div><div class="card-title">${m.name}</div><div class="tiny">${Math.round(m.calories)} kcal · ${m.protein}g protein · ${m.confidence || m.source}</div></div></div>`).join("");
}

async function openFoodDetail(foodId) {
  openSheet(`<div class="flex gap-8 mb-16"><div class="spinner"></div><span>Loading…</span></div>`);
  const data = await getFoodDetail(foodId);
  if (data.error || !data.food) { openSheet(`<p>${data.error || "Not found"}</p>`); return; }
  const food = data.food;
  const servings = food.servings || [];
  let html = `<h2 class="display mb-8" style="font-size:1.3rem">${food.food_name}</h2>`;
  if (food.brand_name) html += `<p class="tiny mb-16">${food.brand_name}</p>`;
  html += `<div class="field"><label>Serving</label><select id="serving-select">`;
  servings.forEach((s, i) => { html += `<option value="${i}">${s.serving_description} — ${s.calories} kcal, ${s.protein}g P</option>`; });
  html += `</select></div><div class="field"><label>Portions</label><input type="number" id="portion-mult" value="1" min="0.25" step="0.25" /></div><button class="btn btn-primary btn-block" id="log-food-btn">Log meal</button>`;
  openSheet(html);
  document.getElementById("log-food-btn").onclick = () => {
    const idx = parseInt(document.getElementById("serving-select").value, 10);
    const mult = parseFloat(document.getElementById("portion-mult").value) || 1;
    const { analysis } = logFoodFromDetail(food, servings[idx], mult);
    closeSheet();
    alert(analysis.summary);
    renderFood();
    refreshToday();
  };
}

function renderMove() {
  const el = document.getElementById("move-content");
  const mov = getTodayMovement();
  const target = getStepTarget();
  const walk = getActiveWalk();
  el.innerHTML = `<div class="glass card mb-16"><div class="card-title">Today</div><div class="stat-row"><div><div class="stat-value">${(mov.steps||0).toLocaleString()}</div><div class="stat-label">Steps</div></div><div style="text-align:right"><div class="stat-value">${Math.round((mov.distanceM||0)/1000*10)/10}</div><div class="stat-label">km</div></div></div><div class="bar-track mt-8"><div class="bar-fill" style="width:${Math.min(100,((mov.steps||0)/target)*100)}%"></div></div><p class="tiny mt-8">Source: ${mov.source || "none"} · Target ${target.toLocaleString()}</p></div>
    <div class="glass card mb-16" id="walk-panel">${walk ? renderWalkLive(walk) : `<div class="card-title mb-12">Walk mode</div><p class="tiny mb-12">Uses GPS for distance when available. Steps are estimated from distance unless a sensor is present. No fabricated data.</p><button class="btn btn-primary btn-block" id="start-walk-btn">Start walk</button>`}</div>
    <div class="glass card"><div class="card-title mb-12">Log steps manually</div><div class="flex gap-8"><input type="number" id="manual-steps" placeholder="Steps" style="flex:1" /><button class="btn btn-secondary" id="log-steps-btn">Add</button></div></div>`;
  if (!walk) document.getElementById("start-walk-btn").onclick = () => beginWalkUI(20);
  else bindWalkControls();
  document.getElementById("log-steps-btn").onclick = () => {
    const n = parseInt(document.getElementById("manual-steps").value, 10);
    if (n > 0) { logManualSteps(n); renderMove(); refreshToday(); }
  };
}

function renderWalkLive(walk) {
  const min = Math.floor(walk.elapsedSec / 60);
  const sec = walk.elapsedSec % 60;
  return `<div class="card-title mb-8">Walking</div><div class="stat-value" id="walk-time">${min}:${sec.toString().padStart(2,"0")}</div><div class="tiny mb-12">Distance: <span id="walk-dist">${Math.round(walk.distanceM)}</span> m</div><button class="btn btn-primary btn-block" id="stop-walk-btn">Finish walk</button>`;
}

function beginWalkUI(minutes) {
  startWalk({ goalMinutes: minutes });
  renderMove();
  window.__axisWalkTick = () => {
    const w = getActiveWalk();
    if (!w) return;
    const t = document.getElementById("walk-time");
    const d = document.getElementById("walk-dist");
    if (t) { const min = Math.floor(w.elapsedSec / 60); const sec = w.elapsedSec % 60; t.textContent = `${min}:${sec.toString().padStart(2,"0")}`; }
    if (d) d.textContent = Math.round(w.distanceM);
  };
  bindWalkControls();
}

function bindWalkControls() {
  const btn = document.getElementById("stop-walk-btn");
  if (btn) btn.onclick = () => {
    const finished = stopWalk();
    window.__axisWalkTick = null;
    alert(`Walk complete · ${Math.round(finished.elapsedSec/60)} min · ${finished.distanceM} m`);
    renderMove();
    refreshToday();
  };
}

function renderProgress() {
  const el = document.getElementById("progress-content");
  const s = getState();
  const bottleneck = detectBottleneck();
  const readiness = computeReadiness();
  const workouts = s.workouts || [];
  const last7 = workouts.filter(w => (Date.now() - new Date(w.createdAt).getTime()) < 7*86400000);
  el.innerHTML = `<div class="glass-strong next-move mb-16"><div class="type-badge">BOTTLENECK</div><h2>${bottleneck.label}</h2><p class="subtitle">${bottleneck.action}</p></div>
    <div class="glass card mb-12"><div class="card-title">Training (7 days)</div><div class="stat-value">${last7.length}</div><div class="stat-label">Sessions completed</div></div>
    <div class="glass card mb-12"><div class="card-title">Readiness</div><div class="stat-value">${readiness}%</div><div class="stat-label">${getReadinessLabel(readiness).label}</div></div>
    <div class="glass card mb-12"><div class="card-title">Protein target</div><div class="stat-value">${getProteinTarget()}g</div><div class="stat-label">Daily guideline from profile</div></div>
    <div class="glass card"><div class="card-title mb-12">Log recovery</div>
      <div class="field"><label>Sleep (hours)</label><input type="number" id="rec-sleep" step="0.1" min="0" max="14" /></div>
      <div class="field"><label>Energy (1–10)</label><input type="number" id="rec-energy" min="1" max="10" /></div>
      <div class="field"><label>Soreness (1–10)</label><input type="number" id="rec-soreness" min="1" max="10" /></div>
      <button class="btn btn-primary btn-block" id="log-rec">Save</button></div>`;
  document.getElementById("log-rec").onclick = () => {
    logRecovery({ sleepHours: parseFloat(document.getElementById("rec-sleep").value) || null, energy: parseInt(document.getElementById("rec-energy").value, 10) || null, soreness: parseInt(document.getElementById("rec-soreness").value, 10) || null });
    alert("Recovery logged. Readiness will update.");
    renderProgress();
    refreshToday();
  };
}

function bindOracle() {
  document.getElementById("oracle-fab").addEventListener("click", openOracle);
}

function openOracle() {
  openSheet(`<h2 class="display mb-12" style="font-size:1.35rem">Oracle</h2><p class="tiny mb-16">Ask anything. AXIS already knows your current state.</p><div id="oracle-chat" style="max-height:40vh;overflow-y:auto;margin-bottom:12px"></div><div class="flex gap-8"><input id="oracle-input" placeholder="I'm exhausted / What should I eat? / Can I train?" style="flex:1" /><button class="btn btn-primary" id="oracle-send">Ask</button></div><div class="chip-group mt-12"><button class="chip" data-q="What should I do next?">Next move</button><button class="chip" data-q="I'm exhausted">Exhausted</button><button class="chip" data-q="What should I eat?">Food advice</button></div>`);
  const send = async (text) => {
    if (!text.trim()) return;
    const chat = document.getElementById("oracle-chat");
    chat.innerHTML += `<div class="mb-8" style="text-align:right"><span class="chip selected">${text}</span></div>`;
    chat.innerHTML += `<div class="mb-8 flex gap-8"><div class="spinner"></div></div>`;
    chat.scrollTop = chat.scrollHeight;
    const s = getState();
    const userState = { profile: { name: s.profile.name, goal: s.profile.goal, experience: s.profile.experience }, readiness: computeReadiness(), nutrition: { ...getTodayNutrition(), proteinTarget: getProteinTarget() }, movement: getTodayMovement(), lastWorkout: s.workouts[0] ? `${Math.round((Date.now()-new Date(s.workouts[0].createdAt).getTime())/86400000)} days ago` : "none" };
    const res = await askOracle({ messages: [{ role: "system", content: "You are AXIS Oracle. Be concise, specific, and grounded in the user state." }, { role: "user", content: `State:\n${JSON.stringify(userState, null, 0)}\n\nQuestion: ${text}` }] });
    chat.lastChild.remove();
    if (res.error || res.offline) {
      const local = decideNextMove();
      chat.innerHTML += `<div class="glass card mb-8"><p>${res.error || ""}</p><p class="mt-8"><strong>Local decision:</strong> ${local.title} — ${local.subtitle}</p></div>`;
    } else {
      chat.innerHTML += `<div class="glass card mb-8"><p style="white-space:pre-wrap">${res.content}</p></div>`;
    }
    chat.scrollTop = chat.scrollHeight;
  };
  document.getElementById("oracle-send").onclick = () => { const input = document.getElementById("oracle-input"); send(input.value); input.value = ""; };
  document.getElementById("oracle-input").addEventListener("keydown", e => { if (e.key === "Enter") { send(e.target.value); e.target.value = ""; } });
  document.querySelectorAll("[data-q]").forEach(c => { c.addEventListener("click", () => send(c.dataset.q)); });
}

function bindSheet() {
  document.getElementById("sheet-overlay").addEventListener("click", (e) => { if (e.target.id === "sheet-overlay") closeSheet(); });
}
function openSheet(html) {
  document.getElementById("sheet-content").innerHTML = html;
  document.getElementById("sheet-overlay").classList.add("open");
}
function closeSheet() {
  document.getElementById("sheet-overlay").classList.remove("open");
}

boot();
