/**
 * AXIS Training Engine
 * Exercise database, program generation, adaptive sessions, progression.
 */

import { getState, addWorkout, logSet, generateId } from "./data.js";

// Core exercise library — extensible, movement-pattern based
export const EXERCISE_DB = [
  {
    id: "bb_bench",
    name: "Barbell Bench Press",
    aliases: ["bench", "bench press", "flat bench"],
    pattern: "horizontal_push",
    primary: ["chest"],
    secondary: ["triceps", "anterior_deltoid"],
    equipment: ["barbell", "bench"],
    difficulty: "intermediate",
    experience: ["intermediate", "advanced"],
    instructions: "Lie on bench, feet planted. Unrack, lower to mid-chest with control, press up.",
    setup: "Eyes under bar. Shoulder blades retracted.",
    tempo: "2-1-1-0",
    repRange: [5, 12],
    setRange: [3, 5],
    restSec: [120, 180],
    rpeGuidance: "Leave 1–3 RIR on most sets",
    progressions: ["close_grip_bench", "incline_bench"],
    regressions: ["db_bench", "push_up"],
    alternatives: ["db_bench", "machine_chest_press", "push_up"],
    contraindications: ["shoulder_impingement"],
    cues: ["Drive feet into floor", "Touch chest lightly", "Elbows ~45°"],
    tags: ["strength", "hypertrophy", "compound"]
  },
  {
    id: "db_bench",
    name: "Dumbbell Bench Press",
    aliases: ["db bench", "dumbbell press"],
    pattern: "horizontal_push",
    primary: ["chest"],
    secondary: ["triceps", "anterior_deltoid"],
    equipment: ["dumbbells", "bench"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate", "advanced"],
    instructions: "Lie on bench holding dumbbells. Press up, lower with control to outer chest.",
    tempo: "2-1-1-0",
    repRange: [8, 15],
    setRange: [3, 4],
    restSec: [90, 150],
    alternatives: ["bb_bench", "push_up", "machine_chest_press"],
    tags: ["hypertrophy", "compound"]
  },
  {
    id: "push_up",
    name: "Push-Up",
    aliases: ["press up", "pushup"],
    pattern: "horizontal_push",
    primary: ["chest"],
    secondary: ["triceps", "core"],
    equipment: ["bodyweight"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate"],
    instructions: "Hands under shoulders, body straight. Lower chest toward floor, press back up.",
    tempo: "2-0-1-0",
    repRange: [8, 25],
    setRange: [3, 4],
    restSec: [60, 90],
    alternatives: ["knee_push_up", "db_bench"],
    tags: ["bodyweight", "home"]
  },
  {
    id: "bb_squat",
    name: "Barbell Back Squat",
    aliases: ["squat", "back squat"],
    pattern: "squat",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings", "core"],
    equipment: ["barbell", "rack"],
    difficulty: "intermediate",
    experience: ["intermediate", "advanced"],
    instructions: "Bar on upper back, feet shoulder-width. Sit back and down, drive up through mid-foot.",
    tempo: "2-1-1-0",
    repRange: [5, 12],
    setRange: [3, 5],
    restSec: [150, 210],
    alternatives: ["goblet_squat", "leg_press", "split_squat"],
    tags: ["strength", "compound"]
  },
  {
    id: "goblet_squat",
    name: "Goblet Squat",
    aliases: ["goblet"],
    pattern: "squat",
    primary: ["quads", "glutes"],
    secondary: ["core"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate"],
    instructions: "Hold weight at chest. Squat deep while keeping torso upright.",
    tempo: "2-1-1-0",
    repRange: [8, 15],
    setRange: [3, 4],
    restSec: [90, 120],
    alternatives: ["bb_squat", "bodyweight_squat"],
    tags: ["hypertrophy", "home"]
  },
  {
    id: "rdl",
    name: "Romanian Deadlift",
    aliases: ["RDL", "stiff leg deadlift"],
    pattern: "hinge",
    primary: ["hamstrings", "glutes"],
    secondary: ["erectors", "traps"],
    equipment: ["barbell", "dumbbells"],
    difficulty: "intermediate",
    experience: ["intermediate", "advanced"],
    instructions: "Soft knees, hinge at hips, lower bar along legs until stretch in hamstrings, drive hips forward.",
    tempo: "3-0-1-0",
    repRange: [6, 12],
    setRange: [3, 4],
    restSec: [120, 180],
    alternatives: ["db_rdl", "good_morning", "hip_thrust"],
    tags: ["strength", "posterior"]
  },
  {
    id: "pull_up",
    name: "Pull-Up",
    aliases: ["chin up", "pullup"],
    pattern: "vertical_pull",
    primary: ["lats"],
    secondary: ["biceps", "rear_delts"],
    equipment: ["pull_up_bar"],
    difficulty: "intermediate",
    experience: ["intermediate", "advanced"],
    instructions: "Hang, pull chest toward bar, lower with control.",
    tempo: "2-0-1-1",
    repRange: [4, 12],
    setRange: [3, 5],
    restSec: [120, 180],
    alternatives: ["lat_pulldown", "assisted_pull_up", "inverted_row"],
    tags: ["strength", "bodyweight"]
  },
  {
    id: "lat_pulldown",
    name: "Lat Pulldown",
    aliases: ["pulldown"],
    pattern: "vertical_pull",
    primary: ["lats"],
    secondary: ["biceps"],
    equipment: ["cable", "machine"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate", "advanced"],
    instructions: "Pull bar to upper chest, squeeze lats, control the return.",
    tempo: "2-0-1-1",
    repRange: [8, 15],
    setRange: [3, 4],
    restSec: [90, 120],
    alternatives: ["pull_up", "seated_row"],
    tags: ["hypertrophy"]
  },
  {
    id: "seated_row",
    name: "Seated Cable Row",
    aliases: ["row", "cable row"],
    pattern: "horizontal_pull",
    primary: ["lats", "rhomboids"],
    secondary: ["biceps", "rear_delts"],
    equipment: ["cable"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate", "advanced"],
    instructions: "Pull handle to torso, squeeze shoulder blades, control return.",
    tempo: "2-0-1-1",
    repRange: [8, 15],
    setRange: [3, 4],
    restSec: [90, 120],
    alternatives: ["db_row", "chest_supported_row"],
    tags: ["hypertrophy"]
  },
  {
    id: "db_row",
    name: "Dumbbell Row",
    aliases: ["one arm row", "bent over row"],
    pattern: "horizontal_pull",
    primary: ["lats"],
    secondary: ["biceps", "rear_delts"],
    equipment: ["dumbbell", "bench"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate", "advanced"],
    instructions: "Support on bench, row dumbbell to hip, control down.",
    tempo: "2-0-1-1",
    repRange: [8, 15],
    setRange: [3, 4],
    restSec: [60, 90],
    alternatives: ["seated_row", "inverted_row"],
    tags: ["hypertrophy", "home"]
  },
  {
    id: "ohp",
    name: "Overhead Press",
    aliases: ["military press", "shoulder press"],
    pattern: "vertical_push",
    primary: ["anterior_deltoid", "medial_deltoid"],
    secondary: ["triceps", "upper_chest"],
    equipment: ["barbell", "dumbbells"],
    difficulty: "intermediate",
    experience: ["intermediate", "advanced"],
    instructions: "Press bar from shoulders to lockout overhead, lower with control.",
    tempo: "2-0-1-0",
    repRange: [5, 12],
    setRange: [3, 4],
    restSec: [120, 180],
    alternatives: ["db_shoulder_press", "landmine_press"],
    tags: ["strength"]
  },
  {
    id: "db_shoulder_press",
    name: "Dumbbell Shoulder Press",
    aliases: ["db press", "seated press"],
    pattern: "vertical_push",
    primary: ["anterior_deltoid", "medial_deltoid"],
    secondary: ["triceps"],
    equipment: ["dumbbells"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate", "advanced"],
    instructions: "Press dumbbells from shoulder height to overhead.",
    tempo: "2-0-1-0",
    repRange: [8, 15],
    setRange: [3, 4],
    restSec: [90, 120],
    alternatives: ["ohp", "machine_shoulder_press"],
    tags: ["hypertrophy", "home"]
  },
  {
    id: "hip_thrust",
    name: "Hip Thrust",
    aliases: ["glute bridge", "barbell hip thrust"],
    pattern: "hinge",
    primary: ["glutes"],
    secondary: ["hamstrings"],
    equipment: ["barbell", "bench"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate", "advanced"],
    instructions: "Upper back on bench, bar over hips. Drive hips up, squeeze glutes, lower.",
    tempo: "2-1-1-0",
    repRange: [8, 15],
    setRange: [3, 4],
    restSec: [90, 120],
    alternatives: ["rdl", "glute_bridge"],
    tags: ["hypertrophy", "glutes"]
  },
  {
    id: "plank",
    name: "Plank",
    aliases: ["front plank"],
    pattern: "core",
    primary: ["core"],
    secondary: ["shoulders"],
    equipment: ["bodyweight"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate", "advanced"],
    instructions: "Forearms and toes, body straight, hold.",
    tempo: "iso",
    repRange: [20, 60], // seconds
    setRange: [2, 4],
    restSec: [45, 60],
    alternatives: ["dead_bug", "ab_wheel"],
    tags: ["core", "home"]
  },
  {
    id: "lunges",
    name: "Walking Lunges",
    aliases: ["lunge", "reverse lunge"],
    pattern: "lunge",
    primary: ["quads", "glutes"],
    secondary: ["hamstrings"],
    equipment: ["bodyweight", "dumbbells"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate"],
    instructions: "Step forward, lower until both knees ~90°, drive up and step through.",
    tempo: "2-0-1-0",
    repRange: [8, 14],
    setRange: [3, 4],
    restSec: [60, 90],
    alternatives: ["split_squat", "goblet_squat"],
    tags: ["hypertrophy", "home"]
  },
  {
    id: "face_pull",
    name: "Face Pull",
    aliases: ["facepull"],
    pattern: "horizontal_pull",
    primary: ["rear_delts", "rhomboids"],
    secondary: ["external_rotators"],
    equipment: ["cable", "band"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate", "advanced"],
    instructions: "Pull rope toward face, externally rotate at end, control return.",
    tempo: "2-0-1-1",
    repRange: [12, 20],
    setRange: [2, 4],
    restSec: [45, 75],
    alternatives: ["band_pull_apart", "rear_delt_fly"],
    tags: ["prehab", "posture"]
  },
  {
    id: "farmer_carry",
    name: "Farmer Carry",
    aliases: ["farmers walk"],
    pattern: "carry",
    primary: ["traps", "core", "grip"],
    secondary: ["legs"],
    equipment: ["dumbbells", "kettlebells"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate", "advanced"],
    instructions: "Pick up heavy weights, walk with tall posture for distance or time.",
    tempo: "iso",
    repRange: [20, 60],
    setRange: [2, 4],
    restSec: [60, 90],
    alternatives: ["suitcase_carry"],
    tags: ["conditioning", "home"]
  },
  {
    id: "bike_or_row",
    name: "Bike / Rower Conditioning",
    aliases: ["cardio", "assault bike", "row"],
    pattern: "conditioning",
    primary: ["cardio"],
    secondary: [],
    equipment: ["bike", "rower", "none"],
    difficulty: "beginner",
    experience: ["beginner", "intermediate", "advanced"],
    instructions: "Steady or interval effort based on session goal.",
    tempo: "continuous",
    repRange: [8, 20], // minutes
    setRange: [1, 1],
    restSec: [0, 0],
    alternatives: ["walk", "jump_rope"],
    tags: ["conditioning"]
  }
];

export function getExercise(id) {
  return EXERCISE_DB.find(e => e.id === id) || null;
}

export function findByPattern(pattern, equipmentAvailable = null) {
  let list = EXERCISE_DB.filter(e => e.pattern === pattern);
  if (equipmentAvailable && equipmentAvailable.length) {
    list = list.filter(e => {
      if (!e.equipment || e.equipment.includes("bodyweight") || e.equipment.includes("none")) return true;
      return e.equipment.some(eq => equipmentAvailable.includes(eq) || equipmentAvailable.includes("full_gym"));
    });
  }
  return list;
}

export function intelligentSubstitute(exerciseId, reason = "equipment") {
  const ex = getExercise(exerciseId);
  if (!ex) return null;
  // Prefer alternatives that share pattern and primary muscles
  const candidates = EXERCISE_DB.filter(e =>
    e.id !== exerciseId &&
    e.pattern === ex.pattern &&
    e.primary.some(m => ex.primary.includes(m))
  );
  if (candidates.length) return candidates[0];
  // Fallback to any alternative listed
  if (ex.alternatives?.length) {
    return getExercise(ex.alternatives[0]) || candidates[0];
  }
  return null;
}

/**
 * Generate a session based on focus, duration, mode, equipment, experience
 */
export function generateSession({
  focus = "Full Body",
  durationMin = 45,
  mode = "normal",
  equipment = [],
  experience = "intermediate",
  goal = "fitness"
} = {}) {
  const patternsByFocus = {
    "Upper Body": ["horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull"],
    "Lower Body": ["squat", "hinge", "lunge"],
    "Push": ["horizontal_push", "vertical_push"],
    "Pull": ["horizontal_pull", "vertical_pull"],
    "Full Body": ["squat", "horizontal_push", "hinge", "horizontal_pull", "core"],
    "Recovery": ["core"],
    "Conditioning": ["conditioning", "carry"]
  };

  let patterns = patternsByFocus[focus] || patternsByFocus["Full Body"];
  let setMultiplier = 1;
  let repBias = 0;

  if (mode === "low_energy" || mode === "recovery") {
    setMultiplier = 0.6;
    patterns = patterns.slice(0, 3);
  }
  if (mode === "20_minute" || mode === "time_crunched") {
    setMultiplier = 0.55;
    patterns = patterns.slice(0, 3);
    durationMin = Math.min(durationMin, 25);
  }
  if (mode === "deload") {
    setMultiplier = 0.5;
    repBias = 2;
  }
  if (mode === "minimal_equipment" || mode === "home" || mode === "hotel") {
    equipment = equipment.length ? equipment : ["bodyweight", "dumbbells"];
  }

  const exercises = [];
  const used = new Set();

  for (const pattern of patterns) {
    const candidates = findByPattern(pattern, equipment.length ? equipment : null)
      .filter(e => !used.has(e.id))
      .filter(e => !e.experience || e.experience.includes(experience) || experience === "advanced");

    if (!candidates.length) continue;
    // Prefer compound / matching difficulty
    candidates.sort((a, b) => {
      const aScore = (a.tags?.includes("compound") ? 2 : 0) + (a.difficulty === experience ? 1 : 0);
      const bScore = (b.tags?.includes("compound") ? 2 : 0) + (b.difficulty === experience ? 1 : 0);
      return bScore - aScore;
    });

    const chosen = candidates[0];
    used.add(chosen.id);

    const sets = Math.max(2, Math.round((chosen.setRange[0] + chosen.setRange[1]) / 2 * setMultiplier));
    const repsLow = Math.max(5, chosen.repRange[0] + repBias);
    const repsHigh = chosen.repRange[1] + repBias;

    exercises.push({
      exerciseId: chosen.id,
      name: chosen.name,
      pattern: chosen.pattern,
      sets,
      repRange: [repsLow, repsHigh],
      restSec: chosen.restSec[0],
      rpeTarget: mode === "deload" ? 6 : mode === "low_energy" ? 7 : 8,
      notes: chosen.cues?.[0] || "",
      completedSets: []
    });
  }

  // Add a short core or finisher if time allows
  if (durationMin >= 35 && mode !== "recovery" && !used.has("plank")) {
    const core = getExercise("plank");
    if (core) {
      exercises.push({
        exerciseId: core.id,
        name: core.name,
        pattern: "core",
        sets: 2,
        repRange: [30, 45],
        restSec: 45,
        rpeTarget: 7,
        notes: "Hold quality",
        completedSets: [],
        isTimeBased: true
      });
    }
  }

  return {
    id: generateId("session"),
    focus,
    mode,
    durationMin,
    exercises,
    warmup: ["2–3 min light movement", "arm circles / leg swings", "1–2 light sets of first exercise"],
    cooldown: ["easy walk or breathing", "light stretch for worked areas"],
    createdAt: new Date().toISOString()
  };
}

export function suggestNextLoad(prevSets, exerciseId) {
  // Simple double-progression style
  if (!prevSets || !prevSets.length) return { load: null, reps: null, note: "Start conservatively" };
  const last = prevSets[prevSets.length - 1];
  const avgRpe = prevSets.reduce((s, x) => s + (x.rpe || 7), 0) / prevSets.length;

  if (avgRpe <= 6.5 && last.reps >= (last.targetReps || 10)) {
    return { load: (last.load || 0) + 2.5, reps: last.targetReps || last.reps, note: "Progress load" };
  }
  if (avgRpe >= 9) {
    return { load: Math.max(0, (last.load || 0) - 2.5), reps: last.reps, note: "Reduce slightly" };
  }
  return { load: last.load, reps: last.targetReps || last.reps, note: "Hold load" };
}

export function startWorkoutFromNextMove(nextMove) {
  const s = getState();
  const session = generateSession({
    focus: nextMove.meta?.focus || "Full Body",
    durationMin: nextMove.meta?.durationMin || s.profile.sessionDurationMin || 45,
    mode: nextMove.meta?.mode || "normal",
    equipment: s.profile.equipment || [],
    experience: s.profile.experience || "intermediate",
    goal: s.profile.goal || "fitness"
  });
  return session;
}
