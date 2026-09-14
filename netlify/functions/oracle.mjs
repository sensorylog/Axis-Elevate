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
    const { messages, userState, mode = "chat", max_tokens = 500 } = body;

    let finalMessages = messages;

    // If userState provided without full messages, build a contextual prompt
    if (userState && (!messages || messages.length === 0)) {
      const stateSummary = buildStateSummary(userState);
      finalMessages = [
        {
          role: "system",
          content: `You are AXIS Oracle, the intelligent decision core of an adaptive fitness operating system.
You understand training, nutrition, movement, recovery, and goals as interconnected systems.
Be concise, actionable, and honest about uncertainty. Never invent medical diagnoses.
Always ground advice in the provided user state. Prefer specific next actions over vague encouragement.
Respond in clear natural language. When recommending a next move, structure it clearly.`
        },
        {
          role: "user",
          content: `Current user state:\n${stateSummary}\n\nWhat should the user do next and why? Provide a clear recommendation.`
        }
      ];
    }

    if (!finalMessages || !Array.isArray(finalMessages) || finalMessages.length === 0) {
      return new Response(JSON.stringify({ error: "messages or userState required" }), { status: 400, headers });
    }

    const response = await fetch(FASTROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FASTROUTER_API_KEY}`
      },
      body: JSON.stringify({
        model: "anthropic/claude-opus-4.7",
        messages: finalMessages,
        max_tokens: Math.min(max_tokens, 1200),
        temperature: 0.6,
        stream: false
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("FastRouter error:", response.status, errText);
      return new Response(JSON.stringify({
        error: "Oracle temporarily unavailable",
        detail: process.env.NODE_ENV === "development" ? errText : undefined
      }), { status: 502, headers });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({
      content,
      model: data.model || "anthropic/claude-opus-4.7",
      usage: data.usage || null,
      timestamp: new Date().toISOString()
    }), { status: 200, headers });

  } catch (err) {
    console.error("Oracle function error:", err);
    return new Response(JSON.stringify({
      error: "Oracle service error",
      detail: process.env.NODE_ENV === "development" ? err.message : undefined
    }), { status: 500, headers });
  }
};

function buildStateSummary(state) {
  const parts = [];
  if (state.profile) {
    parts.push(`Profile: ${state.profile.name || "User"}, goal: ${state.profile.goal || "general"}, experience: ${state.profile.experience || "unknown"}`);
  }
  if (state.readiness != null) parts.push(`Readiness: ${state.readiness}%`);
  if (state.sleep != null) parts.push(`Sleep last night: ${state.sleep}h`);
  if (state.energy != null) parts.push(`Energy: ${state.energy}/10`);
  if (state.soreness != null) parts.push(`Soreness: ${state.soreness}/10`);
  if (state.lastWorkout) parts.push(`Last workout: ${state.lastWorkout}`);
  if (state.todayTraining) parts.push(`Today training: ${JSON.stringify(state.todayTraining)}`);
  if (state.nutrition) {
    const n = state.nutrition;
    parts.push(`Today nutrition: ${n.calories || 0} kcal, protein ${n.protein || 0}g / target ${n.proteinTarget || "?"}g, carbs ${n.carbs || 0}g, fat ${n.fat || 0}g`);
  }
  if (state.movement) {
    parts.push(`Movement: ${state.movement.steps || 0} steps (target ${state.movement.target || "?"}), active min ${state.movement.activeMinutes || 0}`);
  }
  if (state.schedule) parts.push(`Schedule note: ${state.schedule}`);
  if (state.journalSnippet) parts.push(`Recent journal: ${state.journalSnippet}`);
  return parts.join("\n") || "No detailed state available.";
}
