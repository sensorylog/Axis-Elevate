/**
 * AXIS Food Module
 * Search, vision, logging, analysis. Proxies through /api/food and /api/vision.
 */

import { getState, addMeal, getTodayNutrition, getProteinTarget } from "./data.js";
import { analyzeMealAgainstGoal } from "./intelligence.js";

const API = {
  search: "/api/food/search",
  detail: (id) => `/api/food/${id}`,
  barcode: "/api/food/barcode",
  vision: "/api/vision"
};

export async function searchFoods(query, limit = 15) {
  if (!query || query.trim().length < 1) return [];
  try {
    const res = await fetch(`${API.search}?query=${encodeURIComponent(query.trim())}&limit=${limit}`);
    if (!res.ok) throw new Error("Search failed");
    const data = await res.json();
    return data.foods || [];
  } catch (err) {
    console.error("Food search error:", err);
    return { error: "Food database unavailable. Try again or add manually.", items: [] };
  }
}

export async function getFoodDetail(foodId) {
  try {
    const res = await fetch(API.detail(foodId));
    if (!res.ok) throw new Error("Detail failed");
    return await res.json();
  } catch (err) {
    console.error("Food detail error:", err);
    return { error: "Could not load food details." };
  }
}

export async function lookupBarcode(barcode) {
  try {
    const res = await fetch(API.barcode, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode })
    });
    if (!res.ok) throw new Error("Barcode failed");
    return await res.json();
  } catch (err) {
    console.error("Barcode error:", err);
    return { error: "Barcode lookup unavailable." };
  }
}

/**
 * Food Vision: send { imageData, mimeType }
 */
export async function analyzeFoodImage(imageData, mimeType = "image/jpeg") {
  try {
    const res = await fetch(API.vision, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData, mimeType })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Vision failed");
    }
    return await res.json();
  } catch (err) {
    console.error("Vision error:", err);
    return {
      error: "Food Vision couldn’t complete. Try another photo.",
      items: []
    };
  }
}

export function logFoodFromDetail(food, serving, portionMultiplier = 1, mealType = "meal") {
  const s = serving;
  const meal = {
    foodId: food.food_id,
    name: food.food_name,
    brand: food.brand_name || null,
    servingDescription: s.serving_description,
    portionMultiplier,
    calories: Math.round((s.calories || 0) * portionMultiplier),
    protein: Math.round((s.protein || 0) * portionMultiplier * 10) / 10,
    carbs: Math.round((s.carbohydrate || 0) * portionMultiplier * 10) / 10,
    fat: Math.round((s.fat || 0) * portionMultiplier * 10) / 10,
    fiber: Math.round((s.fiber || 0) * portionMultiplier * 10) / 10,
    sugar: Math.round((s.sugar || 0) * portionMultiplier * 10) / 10,
    sodium: Math.round((s.sodium || 0) * portionMultiplier),
    source: "fatsecret",
    confidence: "verified",
    mealType
  };

  const analysis = analyzeMealAgainstGoal(meal);
  const entry = addMeal(meal);
  return { entry, analysis };
}

export function logEstimatedMeal({ name, calories, protein, carbs, fat, fiber = 0, confidence = "estimated", source = "vision" }) {
  const meal = {
    name,
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: Math.round(fiber * 10) / 10,
    source,
    confidence
  };
  const analysis = analyzeMealAgainstGoal(meal);
  const entry = addMeal(meal);
  return { entry, analysis };
}

export function getDailyNutritionSummary() {
  const n = getTodayNutrition();
  const proteinTarget = getProteinTarget();
  return {
    ...n,
    proteinTarget,
    proteinPct: proteinTarget ? Math.min(100, Math.round((n.protein / proteinTarget) * 100)) : 0
  };
}
