/**
 * Cheapest-model LLM helper.
 *
 * Routes one-shot JSON completions through the Evolve gateway (Anthropic-
 * compatible) using the Evolve API key, or directly to Anthropic if an
 * ANTHROPIC_API_KEY is present. Always uses the cheapest model (Haiku).
 *
 * Returns { data, source } where source tells the caller whether a real model
 * answered ("gateway"/"anthropic") or we fell back to a deterministic mock.
 */

const EVOLVE_API_KEY = process.env.EVOLVE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GATEWAY_URL =
  process.env.EVOLVE_GATEWAY_URL ||
  "https://swarmkit-gateway-692833842999.us-central1.run.app";

// Cheapest Claude model (registry alias "haiku")
export const CHEAP_MODEL = "claude-haiku-4-5-20251001";

interface MessagesEndpoint {
  url: string;
  key: string;
  source: "gateway" | "anthropic";
}

function resolveEndpoint(): MessagesEndpoint | null {
  // Prefer the Evolve gateway (routes spend through the dashboard).
  if (EVOLVE_API_KEY) {
    return {
      url: `${GATEWAY_URL}/v1/messages`,
      key: EVOLVE_API_KEY,
      source: "gateway",
    };
  }
  if (ANTHROPIC_API_KEY && ANTHROPIC_API_KEY.startsWith("sk-ant-")) {
    return {
      url: "https://api.anthropic.com/v1/messages",
      key: ANTHROPIC_API_KEY,
      source: "anthropic",
    };
  }
  return null;
}

/**
 * Ask the cheapest model for a JSON object. The prompt MUST instruct the model
 * to return raw JSON. Returns parsed object + which backend answered.
 */
export async function cheapJSON<T = any>(
  prompt: string
): Promise<{ data: T | null; source: "gateway" | "anthropic" | "mock" }> {
  const endpoint = resolveEndpoint();
  if (!endpoint) {
    return { data: null, source: "mock" };
  }

  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": endpoint.key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CHEAP_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[cheapLLM:${endpoint.source}] HTTP ${res.status}: ${err.slice(0, 300)}`);
      return { data: null, source: "mock" };
    }

    const json = (await res.json()) as any;
    const text: string = json?.content?.[0]?.text ?? "";
    const cleaned = stripFences(text);
    const data = JSON.parse(cleaned) as T;
    return { data, source: endpoint.source };
  } catch (e) {
    console.error(
      `[cheapLLM:${endpoint.source}] failed:`,
      e instanceof Error ? e.message : e
    );
    return { data: null, source: "mock" };
  }
}

function stripFences(text: string): string {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  }
  // Grab the outermost JSON object if there is surrounding prose.
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) {
    return t.slice(first, last + 1);
  }
  return t;
}
