/**
 * AXIS Training Engine
 * Exercise database, program generation, adaptive sessions, progression.
 */
// training.js
import { store } from './data.js';

export function generateSession() {
  const readiness = store.state.today.readiness;

  if (readiness >= 70) {
    return {
      name: 'Moderate Full-Body',
      description:
        'Squat pattern: 3×8–10\n' +
        'Push (bench/push-up): 3×8–12\n' +
        'Pull (row/pull-up): 3×8–12\n' +
        'Hinge (RDL/hip hinge): 3×8–10\n' +
        'Core: 2–3 sets'
    };
  } else if (readiness >= 40) {
    return {
      name: 'Light Full-Body',
      description:
        'Bodyweight squat: 2×12–15\n' +
        'Push-ups or incline push: 2×8–12\n' +
        'Band or DB row: 2×10–15\n' +
        'Hip hinge (light): 2×10–12\n' +
        'Easy core + mobility'
    };
  } else {
    return {
      name: 'Recovery Movement',
      description:
        '15–20 min easy walk\n' +
        'Gentle mobility for hips, thoracic spine, shoulders'
    };
  }
}
