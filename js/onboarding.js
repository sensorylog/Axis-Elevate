// onboarding.js
import { store } from './data.js';

const onboardingEl = document.getElementById('onboarding');
const appEl = document.getElementById('app');
const form = document.getElementById('onboardingForm');
const steps = Array.from(document.querySelectorAll('fieldset.step'));
const prevBtn = document.getElementById('prevStep');
const nextBtn = document.getElementById('nextStep');
const finishBtn = document.getElementById('finishOnboarding');

let currentStep = 0;

function showStep(i) {
  steps.forEach((s, idx) => {
    s.style.display = idx === i ? 'block' : 'none';
  });
  prevBtn.disabled = i === 0;
  if (i === steps.length - 1) {
    nextBtn.style.display = 'none';
    finishBtn.style.display = 'inline-block';
  } else {
    nextBtn.style.display = 'inline-block';
    finishBtn.style.display = 'none';
  }
}

function validateStep(i) {
  const fields = steps[i].querySelectorAll('input, select, textarea');
  for (const f of fields) {
    if (f.hasAttribute('required') && !f.value.trim()) {
      f.reportValidity();
      return false;
    }
  }
  return true;
}

function collectFormData() {
  const fd = new FormData(form);
  const data = Object.fromEntries(fd.entries());
  return {
    name: data.name.trim(),
    age: Number(data.age),
    sex: data.sex,
    heightCm: Number(data.height),
    weightKg: Number(data.weight),
    goal: data.goal,
    experience: data.experience,
    trainingDays: Number(data.trainingDays),
    sessionLength: Number(data.sessionLength),
    environment: data.environment,
    equipment: data.equipment.trim(),
    activity: data.activity,
    diet: data.diet,
    avoidFoods: data.avoidFoods.trim(),
    cuisines: data.cuisines.trim(),
    mealsPerDay: Number(data.mealsPerDay)
  };
}

if (store.state.onboardingComplete) {
  onboardingEl.classList.add('hidden');
  appEl.classList.remove('hidden');
} else {
  onboardingEl.classList.remove('hidden');
  appEl.classList.add('hidden');
  showStep(0);
}

prevBtn.addEventListener('click', () => {
  if (currentStep > 0) {
    currentStep--;
    showStep(currentStep);
  }
});

nextBtn.addEventListener('click', () => {
  if (!validateStep(currentStep)) return;
  if (currentStep < steps.length - 1) {
    currentStep++;
    showStep(currentStep);
  }
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateStep(currentStep)) return;

  const data = collectFormData();
  store.completeOnboarding(data);

  onboardingEl.classList.add('hidden');
  appEl.classList.remove('hidden');

  // Dispatch event so app.js can react
  window.dispatchEvent(new CustomEvent('axis:onboardingComplete', { detail: data }));
});
