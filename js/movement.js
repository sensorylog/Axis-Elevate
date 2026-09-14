// movement.js
import { store } from './data.js';

let walkTimer = null;

export function startWalk(onTick, onFinish) {
  if (store.state.walk.active) return;

  store.state.walk.active = true;
  store.state.walk.start = Date.now();
  store.save();

  walkTimer = setInterval(() => {
    store.state.walk.elapsed = Math.floor((Date.now() - store.state.walk.start) / 1000);
    store.save();
    onTick(store.state.walk.elapsed);
  }, 1000);

  return () => stopWalk(onFinish);
}

export function stopWalk(onFinish) {
  if (!store.state.walk.active) return;
  clearInterval(walkTimer);
  store.state.walk.active = false;
  const mins = Math.floor(store.state.walk.elapsed / 60);
  const addedSteps = mins * 90;
  store.addSteps(addedSteps);
  store.save();
  onFinish(store.state.walk.elapsed, addedSteps);
}

export function getWalkStatus() {
  return store.state.walk;
}
