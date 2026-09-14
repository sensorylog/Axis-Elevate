/**
 * AXIS API helpers
 */

export async function askOracle({ messages, userState, max_tokens = 500 } = {}) {
  try {
    const res = await fetch("/api/oracle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, userState, max_tokens })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Oracle unavailable");
    }
    return await res.json();
  } catch (err) {
    console.error("Oracle error:", err);
    return {
      content: null,
      error: "AXIS Oracle is offline. Using local decision logic.",
      offline: true
    };
  }
}

export function buildUserStateForOracle() {
  // Lazy import avoidance — caller should pass rich state
  return null;
}
