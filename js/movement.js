/**
 * AXIS Movement Module
 * Real browser APIs where available; never fabricates sensor data.
 * Distinguishes measured vs estimated.
 */

import { getState, setState, logMovement, generateId } from "./data.js";

let activeWalk = null;
let watchId = null;
let stepSensor = null;

export function getTodayMovement() {
  const today = new Date().toISOString().slice(0, 10);
  const s = getState();
  return s.movement.dailyLogs[today] || {
    steps: 0,
    distanceM: 0,
    activeMinutes: 0,
    source: "none"
  };
}

export function getStepTarget() {
  return getState().movement.targetSteps || 8000;
}

export function setStepTarget(n) {
  setState(s => ({
    ...s,
    movement: { ...s.movement, targetSteps: Math.max(2000, Math.min(20000, n)) }
  }));
}

/**
 * Try to use Pedometer / Sensor APIs if present (rare in browsers).
 * Falls back to manual or GPS-based walk tracking.
 */
export async function requestStepPermission() {
  // Most browsers do not expose a continuous step counter like HealthKit.
  // We support:
  // 1. Manual logging
  // 2. Live walk with Geolocation for distance/time
  // 3. If 'Accelerometer' or experimental APIs exist, we can attempt
  return { supported: "geolocation" in navigator, method: "walk_gps_or_manual" };
}

export function startWalk({ goalMinutes = 20 } = {}) {
  if (activeWalk) return activeWalk;

  activeWalk = {
    id: generateId("walk"),
    startedAt: new Date().toISOString(),
    elapsedSec: 0,
    distanceM: 0,
    steps: null, // only if we can measure
    source: "gps_or_timer",
    positions: [],
    goalMinutes
  };

  // Timer
  activeWalk._interval = setInterval(() => {
    activeWalk.elapsedSec += 1;
    if (typeof window.__axisWalkTick === "function") {
      window.__axisWalkTick(activeWalk);
    }
  }, 1000);

  // Geolocation for distance
  if ("geolocation" in navigator) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > 50) return; // ignore poor accuracy
        const prev = activeWalk.positions[activeWalk.positions.length - 1];
        activeWalk.positions.push({ lat: latitude, lng: longitude, t: Date.now() });
        if (prev) {
          const d = haversine(prev.lat, prev.lng, latitude, longitude);
          if (d < 50) activeWalk.distanceM += d; // filter jumps
        }
      },
      (err) => console.warn("Geo error", err),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  }

  return activeWalk;
}

export function getActiveWalk() {
  return activeWalk;
}

export function stopWalk() {
  if (!activeWalk) return null;

  clearInterval(activeWalk._interval);
  if (watchId != null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  const finished = {
    id: activeWalk.id,
    startedAt: activeWalk.startedAt,
    endedAt: new Date().toISOString(),
    elapsedSec: activeWalk.elapsedSec,
    distanceM: Math.round(activeWalk.distanceM),
    steps: activeWalk.steps, // may be null
    source: activeWalk.steps != null ? "measured" : "estimated_from_time_distance",
    // rough energy estimate range (not medical)
    energyKcalRange: estimateWalkEnergy(activeWalk.elapsedSec, activeWalk.distanceM)
  };

  // Persist
  const today = new Date().toISOString().slice(0, 10);
  const current = getTodayMovement();
  logMovement(today, {
    steps: (current.steps || 0) + (finished.steps || estimateStepsFromDistance(finished.distanceM)),
    distanceM: (current.distanceM || 0) + finished.distanceM,
    activeMinutes: (current.activeMinutes || 0) + Math.round(finished.elapsedSec / 60),
    source: finished.steps != null ? "measured" : "mixed",
    lastWalkId: finished.id
  });

  setState(s => ({
    ...s,
    movement: {
      ...s.movement,
      walks: [finished, ...(s.movement.walks || [])].slice(0, 100)
    }
  }));

  activeWalk = null;
  return finished;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function estimateStepsFromDistance(meters) {
  // ~0.78 m per step average
  return Math.round(meters / 0.78);
}

function estimateWalkEnergy(sec, meters) {
  // Very rough MET-based range for moderate walk
  const hours = sec / 3600;
  const low = Math.round(180 * hours);  // ~3 MET
  const high = Math.round(280 * hours); // ~4.5 MET
  return [low, high];
}

export function logManualSteps(steps, date = new Date().toISOString().slice(0, 10)) {
  const current = getState().movement.dailyLogs[date] || {};
  logMovement(date, {
    steps: (current.steps || 0) + steps,
    source: "manual",
    note: "User logged steps"
  });
}
