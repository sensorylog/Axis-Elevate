/**
 * AXIS API helpers
 */
// api.js

export async function callOracle(userState) {
  try {
    const res = await fetch('/api/oracle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userState })
    });
    if (!res.ok) throw new Error('Oracle error ' + res.status);
    const data = await res.json();
    return data.analysis || 'No recommendation.';
  } catch {
    return null;
  }
}

export async function searchFoods(query) {
  try {
    const res = await fetch(`/api/food?mode=search&query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Food search error ' + res.status);
    const data = await res.json();
    return data.foods?.food || [];
  } catch {
    return [];
  }
}

export async function getFoodDetail(foodId) {
  try {
    const res = await fetch(`/api/food?mode=detail&food_id=${encodeURIComponent(foodId)}`);
    if (!res.ok) throw new Error('Food detail error ' + res.status);
    const data = await res.json();
    return data.food || null;
  } catch {
    return null;
  }
}

export async function lookupBarcode(barcode) {
  try {
    const res = await fetch(`/api/food?mode=barcode&barcode=${encodeURIComponent(barcode)}`);
    if (!res.ok) throw new Error('Barcode error ' + res.status);
    const data = await res.json();
    return data.foods?.food?.[0] || null;
  } catch {
    return null;
  }
}
