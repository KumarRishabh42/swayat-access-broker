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
  const prompt = `You are a restricted autonomous agent operating under a least-privilege policy.

You are ONLY permitted to use these capabilities:
${allowList}

Any action outside this allow-list is forbidden — if the task seems to need more, stop and explain what was blocked.

TASK:
${task.userPrompt}

Since external systems are mocked in this demo, simulate the steps you WOULD take using only the allowed capabilities, then write a concise markdown report of what you did (and anything you refused to do) to output/result.md.`;

  let agent: Evolve | null = null;
  try {
    agent = new Evolve().withAgent({ type: "claude", model: CHEAP_ALIAS });

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
      summary: `Ran on ${CHEAP_ALIAS} in an Evolve sandbox`,
      output,
      files,
      runId: res.runId,
      sessionId: res.sessionId,
      model: CHEAP_ALIAS,
      costUsd,
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
