/**
 * Executes an APPROVED task via the Evolve API, using the cheapest model
 * (Haiku) in gateway mode. The agent is told the exact allow-list of
 * capabilities and instructed never to act outside it.
 *
 * NOTE: this spins up a real cloud sandbox and costs a small amount per run.
 * It only runs for decisions whose status === "approved" AND when execution
 * was explicitly requested.
 */
import { Evolve } from "@evolvingmachines/sdk";
import { CapabilityScope, ExecutionResult, TaskRequest } from "./types.ts";

const CHEAP_ALIAS = "haiku"; // Evolve registry alias → claude-haiku-4-5-*

// userId whose connected accounts (in the Evolve dashboard) the agent uses.
export const INTEGRATION_USER = "root";

// Our service vocabulary → Evolve managed-integration app names.
// Services NOT in this map (e.g. sap) have no live integration → simulated.
export const SERVICE_TO_APP: Record<string, string> = {
  slack: "slack",
  gmail: "gmail",
  calendar: "googlecalendar",
  github: "github",
  notion: "notion",
  linear: "linear",
};

function describe(caps: CapabilityScope[]): string {
  return caps
    .map((c) => {
      const res = c.resources && c.resources.length ? ` on ${c.resources.join(", ")}` : "";
      return `- ${c.service}: ${c.actions.join(", ")}${res}`;
    })
    .join("\n");
}

export async function executeWithEvolve(
  task: TaskRequest,
  approved: CapabilityScope[]
): Promise<ExecutionResult> {
  const startedAt = new Date().toISOString();

  if (!process.env.EVOLVE_API_KEY) {
    return {
      status: "failed",
      summary: "EVOLVE_API_KEY not set in backend/.env",
      error: "missing EVOLVE_API_KEY",
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  }

  const allowList = describe(approved);

  // Approved services split into REAL (have a managed integration) vs SIMULATED.
  const services = [...new Set(approved.map((c) => c.service.toLowerCase()))];
  const apps = [...new Set(services.map((s) => SERVICE_TO_APP[s]).filter(Boolean))];
  const realServices = services.filter((s) => SERVICE_TO_APP[s]);
  const simulated = services.filter((s) => !SERVICE_TO_APP[s]);

  const realLine = realServices.length
    ? `You have REAL, LIVE access to these services via connected tools — actually perform the work using them: ${realServices.join(", ")}.`
    : "";
  const mockLine = simulated.length
    ? `These services are NOT connected in this demo — SIMULATE them and clearly label any simulated step: ${simulated.join(", ")}.`
    : "";

  const prompt = `You are a restricted autonomous agent operating under a least-privilege policy.

You are ONLY permitted to use these capabilities:
${allowList}

Any action outside this allow-list is forbidden — if the task seems to need more, stop and explain what was blocked.

${realLine}
${mockLine}

TASK:
${task.userPrompt}

When done, write a concise markdown report of what you did (real actions vs simulated) and anything you refused, to output/result.md.`;

  let agent: Evolve | null = null;
  try {
    agent = new Evolve().withAgent({ type: "claude", model: CHEAP_ALIAS });
    if (apps.length) {
      agent = agent.withIntegrations({ userId: INTEGRATION_USER, apps });
    }

    const res = await agent.run({ prompt });

    let costUsd: number | undefined;
    if (res.runId) {
      try {
        const cost = await agent.getRunCost({ runId: res.runId });
        costUsd = cost.cost;
      } catch {
        /* cost may not be ready yet — ignore */
      }
    }

    let output = "";
    let files: string[] = [];
    try {
      const out = await agent.getOutputFiles();
      files = Object.keys(out.files ?? {});
      const resultFile = (out.files as any)?.["result.md"];
      output =
        typeof resultFile === "string"
          ? resultFile
          : res.stdout?.slice(-2000) ?? "";
    } catch {
      output = res.stdout?.slice(-2000) ?? "";
    }

    return {
      status: "success",
      summary:
        apps.length > 0
          ? `Ran on ${CHEAP_ALIAS} with live integrations: ${apps.join(", ")}`
          : `Ran on ${CHEAP_ALIAS} (all services simulated)`,
      output,
      files,
      runId: res.runId,
      sessionId: res.sessionId,
      model: CHEAP_ALIAS,
      costUsd,
      realApps: apps,
      simulated,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  } catch (e) {
    return {
      status: "failed",
      summary: "Evolve run failed",
      error: e instanceof Error ? e.message : String(e),
      model: CHEAP_ALIAS,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  } finally {
    if (agent) {
      try {
        await agent.kill();
      } catch {
        /* ignore */
      }
    }
  }
}
