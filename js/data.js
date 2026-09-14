/**
 * AXIS Data Layer
 * Persistent state, schemas, and local storage management.
 * Everything has stable IDs and timestamps.
 */
// data.js
export const store = {
  state: {
    onboardingComplete: false,
    profile: {
      name: '',
      age: null,
      sex: '',
      heightCm: null,
      weightKg: null,
      goal: '',
      experience: '',
      trainingDays: 3,
      sessionLength: 45,
      environment: 'gym',
      equipment: '',
      activity: 'light',
      diet: 'no_restriction',
      avoidFoods: '',
      cuisines: '',
      mealsPerDay: 3,
      proteinTarget: 140
    },
    today: {
      readiness: 70,
      protein: 0,
      sleep: 7.5,
      steps: 0,
      lastWorkoutDaysAgo: 2,
      consistency: 0.5
    },
    meals: [],
    walk: {
      active: false,
      start: null,
      elapsed: 0
    }
  },

  load() {
    try {
      const raw = localStorage.getItem('axis_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.state = { ...this.state, ...parsed };
      }
    } catch {}
  },

  save() {
    try {
      localStorage.setItem('axis_state', JSON.stringify(this.state));
    } catch {}
  },

  completeOnboarding(formData) {
    this.state.onboardingComplete = true;
    this.state.profile = { ...this.state.profile, ...formData };
    this.computeProteinTarget();
    this.save();
  },

  computeProteinTarget() {
    const p = this.state.profile;
    // Simple heuristic: 1.6–2.2 g/kg depending on goal
    let factor = 1.8;
    if (p.goal === 'fat_loss') factor = 2.0;
    if (p.goal === 'muscle_gain' || p.goal === 'strength') factor = 2.0;
    if (p.experience === 'advanced') factor = 2.2;
    const target = Math.round((p.weightKg || 75) * factor);
    this.state.profile.proteinTarget = target;
  },

  addMeal(meal) {
    this.state.meals.push(meal);
    this.state.today.protein += meal.protein || 0;
    this.save();
  },

  addSteps(steps) {
    this.state.today.steps += steps;
    this.save();
  }
};

// Initialize once
store.load();
