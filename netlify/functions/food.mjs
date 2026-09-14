const FATSECRET_CLIENT_ID = process.env.FATSECRET_CLIENT_ID;
const FATSECRET_CLIENT_SECRET = process.env.FATSECRET_CLIENT_SECRET;

let cachedToken = null;
let tokenExpiry = 0;

async function getFatSecretToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: FATSECRET_CLIENT_ID,
      client_secret: FATSECRET_CLIENT_SECRET,
      scope: "basic"
    });

    const res = await fetch("https://oauth.fatsecret.com/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Token error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000);
    return cachedToken;
  } catch (err) {
    console.error("FatSecret token fetch failed:", err);
    throw err;
  }
}

async function fatSecretGet(path, params = {}) {
  const token = await getFatSecretToken();
  const url = new URL(`https://platform.fatsecret.com/rest/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set("format", "json");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FatSecret ${path} ${res.status}: ${text}`);
  }

  return res.json();
}

export default async (req, context) => {
  // CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/\.netlify\/functions\/food\/?/, "").replace(/^\/api\/food\/?/, "") || "";

    // /api/food/search?query=...
    if (path === "search" || path.startsWith("search")) {
      const query = url.searchParams.get("query") || url.searchParams.get("q") || "";
      if (!query.trim()) {
        return new Response(JSON.stringify({ error: "Missing query" }), { status: 400, headers });
      }

      const limit = Math.min(parseInt(url.searchParams.get("limit") || "15", 10), 50);
      const data = await fatSecretGet("food.search/v3.1", {
        search_expression: query.trim(),
        max_results: String(limit)
      });

      // Normalize response for frontend
      const foods = Array.isArray(data?.foods?.food)
        ? data.foods.food
        : data?.foods?.food
          ? [data.foods.food]
          : [];

      return new Response(JSON.stringify({
        foods: foods.map(f => ({
          food_id: f.food_id,
          food_name: f.food_name,
          food_type: f.food_type,
          brand_name: f.brand_name || null,
          food_description: f.food_description || null
        })),
        source: "fatsecret",
        timestamp: new Date().toISOString()
      }), { status: 200, headers });
    }

    // /api/food/:id  or /api/food/detail?id=
    if (path.match(/^\d+$/) || path === "detail" || path.startsWith("detail")) {
      const foodId = path.match(/^\d+$/) ? path : (url.searchParams.get("id") || url.searchParams.get("food_id"));
      if (!foodId) {
        return new Response(JSON.stringify({ error: "Missing food_id" }), { status: 400, headers });
      }

      const data = await fatSecretGet("food/v4", { food_id: foodId });
      const food = data?.food;
      if (!food) {
        return new Response(JSON.stringify({ error: "Food not found" }), { status: 404, headers });
      }

      // Normalize servings
      let servings = food.servings?.serving || [];
      if (!Array.isArray(servings)) servings = [servings];

      return new Response(JSON.stringify({
        food: {
          food_id: food.food_id,
          food_name: food.food_name,
          food_type: food.food_type,
          brand_name: food.brand_name || null,
          servings: servings.map(s => ({
            serving_id: s.serving_id,
            serving_description: s.serving_description,
            metric_serving_amount: s.metric_serving_amount,
            metric_serving_unit: s.metric_serving_unit,
            number_of_units: s.number_of_units,
            measurement_description: s.measurement_description,
            calories: parseFloat(s.calories) || 0,
            carbohydrate: parseFloat(s.carbohydrate) || 0,
            protein: parseFloat(s.protein) || 0,
            fat: parseFloat(s.fat) || 0,
            fiber: parseFloat(s.fiber) || 0,
            sugar: parseFloat(s.sugar) || 0,
            sodium: parseFloat(s.sodium) || 0,
            saturated_fat: parseFloat(s.saturated_fat) || 0
          }))
        },
        source: "fatsecret",
        confidence: "verified",
        timestamp: new Date().toISOString()
      }), { status: 200, headers });
    }

    // /api/food/barcode
    if (path === "barcode" || path.startsWith("barcode")) {
      let barcode = url.searchParams.get("barcode");
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        barcode = body.barcode || barcode;
      }
      if (!barcode) {
        return new Response(JSON.stringify({ error: "Missing barcode" }), { status: 400, headers });
      }

      const data = await fatSecretGet("barcode/v2", { barcode });
      const foods = Array.isArray(data?.foods?.food)
        ? data.foods.food
        : data?.foods?.food
          ? [data.foods.food]
          : [];

      return new Response(JSON.stringify({
        foods: foods.map(f => ({
          food_id: f.food_id,
          food_name: f.food_name,
          brand_name: f.brand_name || null,
          food_description: f.food_description || null
        })),
        source: "fatsecret",
        timestamp: new Date().toISOString()
      }), { status: 200, headers });
    }

    // Default: health / info
    return new Response(JSON.stringify({
      status: "ok",
      service: "AXIS Food (FatSecret proxy)",
      endpoints: ["/api/food/search?query=", "/api/food/{id}", "/api/food/barcode"]
    }), { status: 200, headers });

  } catch (err) {
    console.error("Food function error:", err);
    return new Response(JSON.stringify({
      error: "Food service temporarily unavailable",
      detail: process.env.NODE_ENV === "development" ? err.message : undefined
    }), { status: 500, headers });
  }
};
