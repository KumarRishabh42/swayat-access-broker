import { Router } from "express";
import { v4 as uuid } from "uuid";
import { Persona, TaskRequest, PolicyDecision } from "./types.ts";
import { personaDB, taskDB, decisionDB } from "./db.ts";
import { isSubset, generateReasoning } from "./policyEngine.ts";
import { proposeCapabilities } from "./llmProposer.ts";
import { deriveCeiling } from "./personaCeiling.ts";
import { executeWithEvolve } from "./evolveRunner.ts";

const router = Router();

// ============ PERSONAS ============

router.get("/personas", (_req, res) => {
  res.json(personaDB.getAll());
});

// Create a persona from a name + role; the cheapest model derives its
// bare-minimum capability ceiling, which is cached on the persona.
router.post("/personas", async (req, res) => {
  const { name, role } = req.body as { name: string; role: string };
  if (!name || !role) {
    return res.status(400).json({ error: "name and role are required" });
  }

  console.log(`[ceiling] Deriving ceiling for persona "${name}"...`);
  const { ceiling, source } = await deriveCeiling(name, role);
  console.log(`[ceiling] (${source})`, ceiling);

  const persona: Persona = {
    id: uuid().slice(0, 8),
    name,
    role,
    ceiling,
    ceilingSource: source,
    ceilingComputedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  personaDB.create(persona);
  res.json(persona);
});

router.get("/personas/:id", (req, res) => {
  const persona = personaDB.getById(req.params.id);
  if (!persona) return res.status(404).json({ error: "Not found" });
  res.json(persona);
});

// Re-derive the ceiling with the cheapest model.
router.post("/personas/:id/recompute", async (req, res) => {
  const persona = personaDB.getById(req.params.id);
  if (!persona) return res.status(404).json({ error: "Not found" });

  const { ceiling, source } = await deriveCeiling(persona.name, persona.role);
  personaDB.update(persona.id, {
    ceiling,
    ceilingSource: source,
    ceilingComputedAt: new Date().toISOString(),
  });
  res.json(personaDB.getById(persona.id));
});

// Manual override of the ceiling.
router.put("/personas/:id", (req, res) => {
  const { ceiling } = req.body as { ceiling: Persona["ceiling"] };
  personaDB.update(req.params.id, {
    ceiling,
    ceilingSource: "manual",
    ceilingComputedAt: new Date().toISOString(),
  });
  res.json(personaDB.getById(req.params.id));
});

router.delete("/personas/:id", (req, res) => {
  personaDB.delete(req.params.id);
  res.json({ deleted: true });
});

// ============ TASKS ============

// Submit a task: propose (cheap LLM) → check against cached ceiling → decide.
// If approved AND execute=true, run via Evolve (Haiku) in the background.
router.post("/tasks", async (req, res) => {
  const { personaId, description, userPrompt, execute } = req.body as {
    personaId: string;
    description?: string;
    userPrompt: string;
    execute?: boolean;
  };

  const persona = personaDB.getById(personaId);
  if (!persona) return res.status(404).json({ error: "Persona not found" });
  if (!userPrompt) return res.status(400).json({ error: "userPrompt required" });

  const task: TaskRequest = {
    id: uuid().slice(0, 8),
    personaId,
    description: description ?? "",
    userPrompt,
    submittedAt: new Date().toISOString(),
  };
  taskDB.create(task);

  console.log(`[task ${task.id}] Proposing capabilities...`);
  const { proposed, source } = await proposeCapabilities(userPrompt);

  const check = isSubset(proposed, persona.ceiling);
  const reasoning = generateReasoning(proposed, check, persona.ceiling);
  const willExecute = execute && check.isAllowed;

  const decision: PolicyDecision = {
    taskId: task.id,
    personaId,
    status: check.isAllowed ? "approved" : "denied",
    proposedCapabilities: proposed,
    approvedCapabilities: check.approved,
    deniedCapabilities: check.denied,
    reasoning,
    proposalSource: source,
    decidedAt: new Date().toISOString(),
    execution: {
      status: willExecute ? "pending" : "skipped",
      summary: willExecute
        ? "Queued for Evolve execution"
        : check.isAllowed
        ? "Execution not requested"
        : "Denied by policy — not executed",
    },
  };
  decisionDB.create(decision);

  // Respond immediately; run Evolve in the background if approved+requested.
  res.json({ task, decision });

  if (willExecute) {
    decisionDB.update(task.id, {
      execution: { status: "running", summary: "Running on Evolve (haiku)..." },
    });
    console.log(`[task ${task.id}] Executing via Evolve (haiku)...`);
    executeWithEvolve(task, check.approved)
      .then((execution) => {
        decisionDB.update(task.id, { execution });
        console.log(`[task ${task.id}] Execution ${execution.status} (cost: $${execution.costUsd ?? "?"})`);
      })
      .catch((e) => {
        decisionDB.update(task.id, {
          execution: {
            status: "failed",
            summary: "Execution crashed",
            error: e instanceof Error ? e.message : String(e),
          },
        });
      });
  }
});

router.get("/tasks/:id", (req, res) => {
  const task = taskDB.getById(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(task);
});

// ============ DECISIONS / AUDIT ============

// Polled by the dashboard to track background execution progress.
router.get("/decisions/:taskId", (req, res) => {
  const decision = decisionDB.getByTaskId(req.params.taskId);
  if (!decision) return res.status(404).json({ error: "Not found" });
  res.json(decision);
});

router.get("/audit-log", (_req, res) => {
  res.json(decisionDB.getAll());
});

export default router;
