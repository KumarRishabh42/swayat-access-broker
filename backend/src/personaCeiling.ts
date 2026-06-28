/**
 * Derives a persona's bare-minimum capability ceiling from its role
 * description using the cheapest model. This is computed ONCE per persona and
 * cached; subsequent task requests are checked against the cached ceiling.
 */
import { CapabilityScope } from "./types.ts";
import { cheapJSON } from "./cheapLLM.ts";
import { SERVICE_VOCAB } from "./vocab.ts";

export async function deriveCeiling(
  name: string,
  role: string
): Promise<{ ceiling: CapabilityScope[]; source: "ai" | "mock" }> {
  const prompt = `You are a least-privilege access designer.

A persona named "${name}" has this role: "${role}"

Determine the BARE MINIMUM set of API capabilities this persona should EVER be
allowed — the hard ceiling. Be conservative: grant only what the role clearly
requires, and prefer read-only actions unless the role implies writes.

${SERVICE_VOCAB}

Return ONLY raw JSON, no prose, in exactly this shape:
{
  "capabilities": [
    { "service": "slack", "actions": ["read_message", "post_message"], "resources": ["#general"] },
    { "service": "sap", "actions": ["read_invoice"], "resources": [] }
  ]
}`;

  const { data, source } = await cheapJSON<{ capabilities: CapabilityScope[] }>(
    prompt
  );

  if (data?.capabilities && Array.isArray(data.capabilities)) {
    return { ceiling: normalize(data.capabilities), source: "ai" };
  }

  return { ceiling: mockCeiling(role), source: "mock" };
}

function normalize(caps: CapabilityScope[]): CapabilityScope[] {
  return caps
    .filter((c) => c && c.service && Array.isArray(c.actions))
    .map((c) => ({
      service: String(c.service).toLowerCase().trim(),
      actions: c.actions.map((a) => String(a).toLowerCase().trim()),
      resources: c.resources?.map((r) => String(r).trim()) ?? [],
    }));
}

// Deterministic fallback so the demo always produces a sensible ceiling.
function mockCeiling(role: string): CapabilityScope[] {
  const r = role.toLowerCase();
  const caps: CapabilityScope[] = [];

  if (r.includes("financ") || r.includes("invoice") || r.includes("account")) {
    caps.push({ service: "sap", actions: ["read_vendor", "read_invoice"], resources: [] });
    caps.push({ service: "slack", actions: ["read_message", "post_message"], resources: ["#accounting"] });
  }
  if (r.includes("support") || r.includes("customer")) {
    caps.push({ service: "gmail", actions: ["read", "send"], resources: [] });
    caps.push({ service: "slack", actions: ["read_message", "post_message"], resources: ["#support"] });
  }
  if (r.includes("engineer") || r.includes("developer") || r.includes("dev")) {
    caps.push({ service: "github", actions: ["read_repo", "create_issue"], resources: [] });
    caps.push({ service: "slack", actions: ["read_message", "post_message"], resources: ["#engineering"] });
  }
  if (caps.length === 0) {
    caps.push({ service: "slack", actions: ["read_message"], resources: ["#general"] });
  }
  return caps;
}
