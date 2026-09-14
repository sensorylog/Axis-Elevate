/**
 * AXIS Data Layer
 * Persistent state, schemas, and local storage management.
 * Everything has stable IDs and timestamps.
 */

const STORAGE_KEY = "axis_v1_state";
const DB_NAME = "axis_db";
const DB_VERSION = 1;

export const DEFAULT_STATE = {
  version: 1,
  onboarded: false,
  profile: {
    id: null,
    name: "",
    photo: null,
    age: null,
    sex: null,
    heightCm: null,
    weightKg: null,
    goal: null, // fat_loss | muscle_gain | strength | fitness | general | custom
    customGoal: "",
    experience: null, // beginner | intermediate | advanced
    trainingDaysPerWeek: 3,
    preferredDays: [],
    sessionDurationMin: 45,
    preferredTime: "evening",
    environment: "mixed", // gym | home | outdoors | hotel | mixed
    equipment: [],
    activityLevel: "moderately_active",
    dietaryPreferences: [],
    allergies: [],
    avoidedFoods: [],
    preferredCuisines: [],
    mealFrequency: 3,
    createdAt: null,
    updatedAt: null
  },
  preferences: {
    theme: "system", // dark | light | system
    units: "metric",
    reducedMotion: false,
    notificationsEnabled: false
  },
  workouts: [],
  exercises: {}, // cache of exercise definitions
  sets: [],
  foods: {}, // food_id -> details cache
  meals: [],
  movement: {
    dailyLogs: {}, // date -> { steps, distance, activeMinutes, source }
    walks: [],
    targetSteps: 8000
  },
  recovery: {
    logs: [] // { date, sleepHours, energy, soreness, notes }
  },
  progress: {
    weightLog: [],
    measurements: [],
    photos: [],
    prs: {}
  },
  memory: {
    profile: [],
    preferences: [],
    foods: [],
    training: [],
    movement: [],
    schedule: [],
    behavior: [],
    journal: [],
    patterns: []
  },
  journal: [],
  schedule: [],
  notifications: [],
  aiContext: {
    lastOracle: null,
    lastNextMove: null,
    readiness: 70
  },
  meta: {
    lastSaved: null,
    lastSynced: null
  }
};

let state = structuredClone(DEFAULT_STATE);
let listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => {
    try { fn(state); } catch (e) { console.error(e); }
  });
}

export function setState(partial) {
  if (typeof partial === "function") {
    state = partial(state);
  } else {
    state = { ...state, ...partial };
  }
  state.meta.lastSaved = new Date().toISOString();
  persist();
  notify();
}

export function updateProfile(updates) {
  setState(s => ({
    ...s,
    profile: {
      ...s.profile,
      ...updates,
      updatedAt: new Date().toISOString()
    }
  }));
}

export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("localStorage full or unavailable", e);
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults to handle schema evolution
      state = deepMerge(structuredClone(DEFAULT_STATE), parsed);
      notify();
      return true;
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }
  return false;
}

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

export function resetAll() {
  state = structuredClone(DEFAULT_STATE);
  localStorage.removeItem(STORAGE_KEY);
  notify();
}

export function generateId(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

// ---------- Domain helpers ----------

export function addMeal(meal) {
  const entry = {
    id: generateId("meal"),
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    ...meal
  };
  setState(s => ({
    ...s,
    meals: [entry, ...s.meals].slice(0, 500)
  }));
  return entry;
}

export function getTodayMeals() {
  const today = new Date().toISOString().slice(0, 10);
  return state.meals.filter(m => m.date === today);
}

export function getTodayNutrition() {
  const meals = getTodayMeals();
  return meals.reduce((acc, m) => {
    acc.calories += m.calories || 0;
    acc.protein += m.protein || 0;
    acc.carbs += m.carbs || 0;
    acc.fat += m.fat || 0;
    acc.fiber += m.fiber || 0;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
}

export function addWorkout(workout) {
  const entry = {
    id: generateId("wo"),
    createdAt: new Date().toISOString(),
    ...workout
  };
  setState(s => ({
    ...s,
    workouts: [entry, ...s.workouts].slice(0, 200)
  }));
  return entry;
}

export function logSet(setData) {
  const entry = {
    id: generateId("set"),
    timestamp: new Date().toISOString(),
    ...setData
  };
  setState(s => ({
    ...s,
    sets: [entry, ...s.sets].slice(0, 2000)
  }));
  return entry;
}

export function logRecovery(entry) {
  const log = {
    id: generateId("rec"),
    date: new Date().toISOString().slice(0, 10),
    timestamp: new Date().toISOString(),
    ...entry
  };
  setState(s => ({
    ...s,
    recovery: {
      ...s.recovery,
      logs: [log, ...s.recovery.logs].slice(0, 90)
    }
  }));
  return log;
}

export function logMovement(date, data) {
  setState(s => ({
    ...s,
    movement: {
      ...s.movement,
      dailyLogs: {
        ...s.movement.dailyLogs,
        [date]: { ...s.movement.dailyLogs[date], ...data, updatedAt: new Date().toISOString() }
      }
    }
  }));
}

export function addJournalEntry(text, tags = []) {
  const entry = {
    id: generateId("jnl"),
    timestamp: new Date().toISOString(),
    text,
    tags
  };
  setState(s => ({
    ...s,
    journal: [entry, ...s.journal].slice(0, 200)
  }));
  return entry;
}

export function getProteinTarget() {
  const p = state.profile;
  if (!p.weightKg) return 140;
  // Simple heuristic; will be refined by intelligence layer
  const mult = p.goal === "muscle_gain" ? 2.0 : p.goal === "fat_loss" ? 1.8 : 1.6;
  return Math.round(p.weightKg * mult);
}

export function getCalorieTarget() {
  // Placeholder TDEE-style; intelligence layer improves this
  const p = state.profile;
  if (!p.weightKg || !p.age || !p.sex || !p.heightCm) return 2200;
  // Mifflin-St Jeor rough
  let bmr;
  if (p.sex === "male") {
    bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + 5;
  } else {
    bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age - 161;
  }
  const activity = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    highly_active: 1.725
  }[p.activityLevel] || 1.55;
  let tdee = bmr * activity;
  if (p.goal === "fat_loss") tdee -= 400;
  if (p.goal === "muscle_gain") tdee += 250;
  return Math.round(tdee);
}

// Initialize on import
load();
