/**
 * Proposes the minimum capabilities a specific TASK needs, using the cheapest
 * model. This is the "model proposes" half — the deterministic policy engine
 * then checks the proposal against the persona's cached ceiling.
 */
import { CapabilityScope } from "./types.ts";
import { cheapJSON } from "./cheapLLM.ts";
import { SERVICE_VOCAB } from "./vocab.ts";

export async function proposeCapabilities(
  userPrompt: string
): Promise<{ proposed: CapabilityScope[]; source: "ai" | "mock" }> {
  const prompt = `Given this task: "${userPrompt}"

List the MINIMUM API capabilities needed to complete it. Be conservative.

${SERVICE_VOCAB}

Return ONLY raw JSON, no prose:
{
  "capabilities": [
    { "service": "sap", "actions": ["read_invoice"], "resources": [] },
    { "service": "slack", "actions": ["post_message"], "resources": ["#accounting"] }
  ]
}`;

  const { data, source } = await cheapJSON<{ capabilities: CapabilityScope[] }>(
    prompt
  );

  if (data?.capabilities && Array.isArray(data.capabilities)) {
    return { proposed: normalize(data.capabilities), source: "ai" };
  }

  return { proposed: mockProposal(userPrompt), source: "mock" };
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

function mockProposal(userPrompt: string): CapabilityScope[] {
  const p = userPrompt.toLowerCase();
  if (p.includes("payment") || p.includes("pay ")) {
    return [
      { service: "sap", actions: ["read_vendor", "read_invoice", "post_payment"], resources: [] },
      { service: "slack", actions: ["post_message"], resources: ["#accounting"] },
    ];
  }
  if (p.includes("invoice") || p.includes("vendor")) {
    return [
      { service: "sap", actions: ["read_vendor", "read_invoice"], resources: [] },
      { service: "slack", actions: ["post_message"], resources: ["#accounting"] },
    ];
  }
  if (p.includes("issue") || p.includes("github") || p.includes("repo")) {
    return [{ service: "github", actions: ["read_repo", "create_issue"], resources: [] }];
  }
  if (p.includes("email") || p.includes("gmail")) {
    return [{ service: "gmail", actions: ["read", "send"], resources: [] }];
  }
  return [{ service: "slack", actions: ["read_message", "post_message"], resources: ["#general"] }];
}
