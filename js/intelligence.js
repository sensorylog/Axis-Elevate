/**
 * AXIS Intelligence Layer
 * Deterministic decision engine + readiness + next-move logic.
 * Works offline; Oracle enhances when available.
 */

import { getState, getTodayNutrition, getProteinTarget, getCalorieTarget } from "./data.js";

export function computeReadiness() {
  const s = getState();
  let score = 70; // baseline

  const logs = s.recovery.logs || [];
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const recent = logs.find(l => l.date === today || l.date === yesterday);
  if (recent) {
    if (recent.sleepHours != null) {
      if (recent.sleepHours >= 7.5) score += 12;
      else if (recent.sleepHours >= 6.5) score += 4;
      else if (recent.sleepHours < 5.5) score -= 18;
      else score -= 8;
    }
    if (recent.energy != null) {
      score += (recent.energy - 5) * 3;
    }
    if (recent.soreness != null) {
      score -= (recent.soreness - 3) * 4;
    }
  }

  // Recent training load
  const recentWorkouts = (s.workouts || []).filter(w => {
    const d = new Date(w.createdAt || w.date);
    return (Date.now() - d.getTime()) < 3 * 86400000;
  });
  if (recentWorkouts.length >= 3) score -= 8;
  if (recentWorkouts.length === 0) score += 5;

  // Clamp
  score = Math.max(15, Math.min(98, Math.round(score)));
  return score;
}

export function getReadinessLabel(score) {
  if (score >= 80) return { label: "Ready", tone: "good" };
  if (score >= 60) return { label: "Adaptive", tone: "ok" };
  return { label: "Recovery-focused", tone: "low" };
}

/**
 * Core decision: WHAT SHOULD I DO NEXT?
 * Returns a structured recommendation object.
 */
export function decideNextMove() {
  const s = getState();
  const readiness = computeReadiness();
  const nutrition = getTodayNutrition();
  const proteinTarget = getProteinTarget();
  const calorieTarget = getCalorieTarget();
  const today = new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date().getDay(); // 0 Sun

  const todayWorkouts = (s.workouts || []).filter(w => (w.date || w.createdAt || "").startsWith(today));
  const movementToday = s.movement.dailyLogs[today] || {};
  const steps = movementToday.steps || 0;
  const stepTarget = s.movement.targetSteps || 8000;

  // Priority rules (deterministic, explainable)
  // 1. Very low readiness → recover
  if (readiness < 45) {
    return {
      type: "RECOVER",
      title: "Recovery first",
      subtitle: `Readiness is ${readiness}%. An easy walk or rest will serve you better.`,
      actionLabel: "Start easy walk",
      action: "start_walk",
      meta: { durationMin: 15, intensity: "easy" },
      reason: "Low recovery signals detected",
      readiness,
      confidence: 0.85
    };
  }

  // 2. Training day logic
  const preferredDays = s.profile.preferredDays || [];
  const daysPerWeek = s.profile.trainingDaysPerWeek || 3;
  const isPreferredDay = preferredDays.length === 0 || preferredDays.includes(dayOfWeek);
  const trainedRecently = todayWorkouts.length > 0;

  if (!trainedRecently && isPreferredDay && readiness >= 55) {
    const duration = s.profile.sessionDurationMin || 45;
    const goal = s.profile.goal || "fitness";
    let focus = "Full Body";
    if (goal === "strength" || goal === "muscle_gain") {
      // Simple rotation based on day
      const focuses = ["Upper Body", "Lower Body", "Push", "Pull", "Full Body"];
      focus = focuses[dayOfWeek % focuses.length];
    }

    const intensity = readiness >= 75 ? "Moderate–Hard" : "Moderate";
    return {
      type: "TRAIN",
      title: "You’re ready",
      subtitle: `${focus} · ${duration} min · ${intensity}`,
      actionLabel: "Start session",
      action: "start_workout",
      meta: { focus, durationMin: duration, mode: readiness < 65 ? "low_energy" : "normal" },
      reason: `Preferred training day + readiness ${readiness}%`,
      readiness,
      confidence: 0.8
    };
  }

  // 3. Protein lagging significantly and still early/mid day
  const hour = new Date().getHours();
  if (nutrition.protein < proteinTarget * 0.45 && hour >= 11 && hour < 20) {
    return {
      type: "FOOD",
      title: "Protein is behind",
      subtitle: `${Math.round(nutrition.protein)}g of ${proteinTarget}g target so far`,
      actionLabel: "Build a meal",
      action: "open_food",
      meta: { focus: "protein" },
      reason: "Daily protein trajectory low relative to goal",
      readiness,
      confidence: 0.75
    };
  }

  // 4. Movement shortfall late in day
  if (steps < stepTarget * 0.6 && hour >= 15) {
    const remaining = Math.max(0, stepTarget - steps);
    return {
      type: "MOVE",
      title: "Movement gap",
      subtitle: `You’re about ${remaining.toLocaleString()} steps from today’s target`,
      actionLabel: "Start walk",
      action: "start_walk",
      meta: { targetSteps: remaining },
      reason: "Daily movement below useful target",
      readiness,
      confidence: 0.7
    };
  }

  // 5. Already trained + nutrition ok → review or light move
  if (trainedRecently) {
    if (nutrition.protein < proteinTarget * 0.85) {
      return {
        type: "FOOD",
        title: "Finish the day strong",
        subtitle: "Training done. Protein still has room.",
        actionLabel: "Log a meal",
        action: "open_food",
        meta: {},
        reason: "Post-training nutrition support",
        readiness,
        confidence: 0.7
      };
    }
    return {
      type: "REVIEW",
      title: "Solid day so far",
      subtitle: "Training and core movement covered. Review nutrition or rest.",
      actionLabel: "Open Progress",
      action: "open_progress",
      meta: {},
      reason: "Primary actions completed",
      readiness,
      confidence: 0.65
    };
  }

  // 6. Default: gentle move or recovery
  if (readiness < 65) {
    return {
      type: "RECOVER",
      title: "Keep it light",
      subtitle: "A short walk or mobility will help more than forcing a session.",
      actionLabel: "Start walk",
      action: "start_walk",
      meta: { durationMin: 20 },
      reason: "Moderate readiness, no forced training",
      readiness,
      confidence: 0.7
    };
  }

  return {
    type: "TRAIN",
    title: "Optional session available",
    subtitle: "You have capacity. A focused 30–40 min session fits.",
    actionLabel: "Start session",
    action: "start_workout",
    meta: { focus: "Full Body", durationMin: 35, mode: "normal" },
    reason: "Capacity present, no hard schedule conflict",
    readiness,
    confidence: 0.6
  };
}

export function analyzeMealAgainstGoal(meal, state = getState()) {
  const proteinTarget = getProteinTarget();
  const today = getTodayNutrition();
  const projectedProtein = today.protein + (meal.protein || 0);
  const notes = [];

  if ((meal.protein || 0) >= 25) notes.push("Strong protein contribution.");
  else if ((meal.protein || 0) < 12) notes.push("Protein is on the low side for this meal.");

  if (projectedProtein >= proteinTarget * 0.9) notes.push("This helps you approach today’s protein target.");
  else notes.push(`Still need roughly ${Math.max(0, Math.round(proteinTarget - projectedProtein))}g protein later.`);

  if ((meal.fiber || 0) >= 5) notes.push("Good fiber.");
  if ((meal.calories || 0) > 800) notes.push("Large energy load — consider portion context.");

  return {
    summary: notes[0] || "Logged.",
    notes,
    projected: { protein: projectedProtein, calories: today.calories + (meal.calories || 0) }
  };
}

export function detectBottleneck() {
  const s = getState();
  const readiness = computeReadiness();
  const nutrition = getTodayNutrition();
  const proteinTarget = getProteinTarget();
  const recentWorkouts = (s.workouts || []).filter(w => {
    return (Date.now() - new Date(w.createdAt || w.date).getTime()) < 14 * 86400000;
  });

  const issues = [];

  if (recentWorkouts.length < (s.profile.trainingDaysPerWeek || 3) * 1.5) {
    issues.push({ key: "consistency", label: "Training consistency", severity: 0.8, action: "Schedule next 3 sessions" });
  }
  if (nutrition.protein < proteinTarget * 0.7) {
    issues.push({ key: "protein", label: "Protein intake", severity: 0.75, action: "Prioritize protein at next meal" });
  }
  if (readiness < 50) {
    issues.push({ key: "recovery", label: "Recovery / sleep", severity: 0.85, action: "Protect sleep tonight" });
  }

  issues.sort((a, b) => b.severity - a.severity);
  return issues[0] || { key: "none", label: "No major bottleneck detected", severity: 0, action: "Keep the current approach" };
}
