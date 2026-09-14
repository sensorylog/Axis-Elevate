const FASTROUTER_API_KEY = process.env.FASTROUTER_API_KEY;
const FASTROUTER_URL = "https://api.fastrouter.ai/api/v1/chat/completions";

export default async (req, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { imageData, mimeType = "image/jpeg" } = body;

    if (!imageData) {
      return new Response(JSON.stringify({ error: "imageData required" }), { status: 400, headers });
    }

    let dataUrl = imageData;
    if (!imageData.startsWith("data:")) {
      dataUrl = `data:${mimeType};base64,${imageData}`;
    }

    const prompt = `You are a precise food identification system for the AXIS fitness app.
Analyze the image and identify the food items present.

Return ONLY valid JSON in this exact structure (no markdown, no extra text):
{
  "items": [
    {
      "name": "food name",
      "confidence": 0.0-1.0,
      "likely_preparations": ["roasted", "fried", "boiled", "raw", "grilled", "steamed"],
      "estimated_portion": "small|medium|large",
      "notes": "brief visual notes"
    }
  ],
  "overall_confidence": 0.0-1.0,
  "scene_description": "short description of the plate/meal"
}

Be honest about uncertainty. Prefer common names. If multiple items, list them separately.
If the image is not food, return items: [] and explain in scene_description.`;

    const response = await fetch(FASTROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FASTROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: "anthropic/claude-opus-4.7",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: dataUrl }
              }
            ]
          }
        ],
        max_tokens: 800,
        temperature: 0.2,
        stream: false
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Vision FastRouter error:", response.status, errText);
      return new Response(JSON.stringify({
        error: "Food Vision could not complete. Try another photo.",
        detail: process.env.NODE_ENV === "development" ? errText : undefined
      }), { status: 502, headers });
    }

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content || "";

    content = content.trim();
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      parsed = {
        items: [],
        overall_confidence: 0.3,
        scene_description: content.slice(0, 200),
        raw: content
      };
    }

    return new Response(JSON.stringify({
      ...parsed,
      source: "axis-vision",
      model: data.model || "anthropic/claude-opus-4.7",
      timestamp: new Date().toISOString()
    }), { status: 200, headers });

  } catch (err) {
    console.error("Vision function error:", err);
    return new Response(JSON.stringify({
      error: "Food Vision couldn't complete. Try another photo.",
      detail: process.env.NODE_ENV === "development" ? err.message : undefined
    }), { status: 500, headers });
  }
};
