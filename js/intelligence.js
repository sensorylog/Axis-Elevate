/**
 * AXIS Intelligence Layer
 * Deterministic decision engine + readiness + next-move logic.
 * Works offline; Oracle enhances when available.
 */
// intelligence.js
import { callOracle } from './api.js';
import { store } from './data.js';

export async function computeNextMove() {
  const s = store.state.today;
  const p = store.state.profile;

  const oracleText = await callOracle({
    readiness: s.readiness,
    protein: s.protein,
    proteinTarget: p.proteinTarget,
    sleep: s.sleep,
    lastWorkout: s.lastWorkoutDaysAgo,
    consistency: Math.round(s.consistency * 100),
    goal: p.goal
  });

  if (oracleText) {
    return oracleText;
  }

  // Local heuristic fallback
  if (s.readiness < 50) {
    return `RECOVER
Your readiness is low today.
Take an easy 15–20 minute walk and prioritize sleep tonight.`;
  }
  if (s.protein < p.proteinTarget * 0.6) {
    return `FOOD
Your protein is low for today.
Build a high‑protein meal or snack now.`;
  }
  if (s.lastWorkoutDaysAgo >= 2) {
    return `TRAIN
You’re ready for a session.
Do a moderate full‑body or upper/lower workout.`;
  }
  return `MOVE
You’re close to your movement target.
Add a short walk to finish strong.`;
}

export function parseNextMove(text) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const type = (lines[0] || 'TRAIN').toUpperCase();
  const title = lines[1] || 'Recommended action';
  const meta = lines.slice(2).join(' ') || '';
  return { type, title, meta };
}
