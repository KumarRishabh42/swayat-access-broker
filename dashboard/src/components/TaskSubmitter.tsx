import React, { useEffect, useRef, useState } from "react";
import { Persona, PolicyDecision } from "../types.ts";
import { tasksApi } from "../api.ts";
import { CapabilityChips } from "./Chips.tsx";

export default function TaskSubmitter({
  personas,
  onSettled,
}: {
  personas: Persona[];
  onSettled: () => void;
}) {
  const [personaId, setPersonaId] = useState("");
  const [description, setDescription] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [execute, setExecute] = useState(true);
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<PolicyDecision | null>(null);
  const pollRef = useRef<number | null>(null);

  const persona = personas.find((p) => p.id === personaId);

  // Poll for background execution updates.
  useEffect(() => {
    const status = decision?.execution?.status;
    const active = status === "pending" || status === "running";
    if (decision && active) {
      pollRef.current = window.setInterval(async () => {
        try {
          const fresh = await tasksApi.getDecision(decision.taskId);
          setDecision(fresh);
          const s = fresh.execution?.status;
          if (s !== "pending" && s !== "running") {
            if (pollRef.current) window.clearInterval(pollRef.current);
            onSettled();
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000);
    }
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [decision, onSettled]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaId || !userPrompt) return;
    setLoading(true);
    setDecision(null);
    try {
      const { decision } = await tasksApi.submit(
        personaId,
        description,
        userPrompt,
        execute
      );
      setDecision(decision);
      onSettled();
    } catch (e) {
      alert("Failed to submit task");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid-2">
      <section className="panel">
        <h2>Run a task</h2>
        <p className="panel-sub">
          The model proposes the access it needs → the policy gate checks it
          against the persona's cached ceiling → if approved, Evolve runs it on
          the cheapest model.
        </p>

        <form onSubmit={submit} className="form">
          <label className="field">
            <span>Persona</span>
            <select value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
              <option value="">— choose a persona —</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          {persona && (
            <div className="ceiling-preview">
              <span className="muted">Ceiling:</span>
              <CapabilityChips caps={persona.ceiling} tone="approved" />
            </div>
          )}

          <label className="field">
            <span>Task title</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Approve September invoices"
            />
          </label>

          <label className="field">
            <span>What should the agent do?</span>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={5}
              placeholder="Describe the task…"
            />
          </label>

          <label className="toggle">
            <input
              type="checkbox"
              checked={execute}
              onChange={(e) => setExecute(e.target.checked)}
            />
            <span>
              Execute on Evolve if approved{" "}
              <span className="muted">(spins up a sandbox · haiku)</span>
            </span>
          </label>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !personaId || !userPrompt}
          >
            {loading ? (
              <>
                <span className="spinner" /> Evaluating…
              </>
            ) : (
              "▶ Submit task"
            )}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Decision pipeline</h2>
        {!decision ? (
          <div className="empty">Submit a task to see the pipeline →</div>
        ) : (
          <Pipeline decision={decision} />
        )}
      </section>
    </div>
  );
}

function Pipeline({ decision }: { decision: PolicyDecision }) {
  const ex = decision.execution;
  return (
    <div className="pipeline">
      {/* Step 1 — Propose */}
      <Step n={1} title="Model proposes access" done state="done">
        <div className="row">
          <span className="muted">via</span>
          <span className={`src ${decision.proposalSource}`}>
            {decision.proposalSource === "ai" ? "🤖 cheap LLM" : "🧩 heuristic"}
          </span>
        </div>
        <CapabilityChips caps={decision.proposedCapabilities} />
      </Step>

      {/* Step 2 — Policy gate */}
      <Step
        n={2}
        title="Policy gate decides"
        state={decision.status === "approved" ? "done" : "denied"}
      >
        <div className={`verdict ${decision.status}`}>
          {decision.status === "approved" ? "✓ APPROVED" : "✗ DENIED"}
        </div>
        <p className="reasoning">{decision.reasoning}</p>
        {decision.approvedCapabilities.length > 0 && (
          <>
            <div className="mini-label approved">Approved</div>
            <CapabilityChips caps={decision.approvedCapabilities} tone="approved" />
          </>
        )}
        {decision.deniedCapabilities.length > 0 && (
          <>
            <div className="mini-label denied">Denied</div>
            <CapabilityChips caps={decision.deniedCapabilities} tone="denied" />
          </>
        )}
      </Step>

      {/* Step 3 — Execute */}
      <Step
        n={3}
        title="Evolve executes"
        state={
          ex?.status === "success"
            ? "done"
            : ex?.status === "failed"
            ? "denied"
            : ex?.status === "skipped"
            ? "idle"
            : "running"
        }
      >
        {(!ex || ex.status === "skipped") && (
          <p className="muted">{ex?.summary ?? "Not executed."}</p>
        )}
        {(ex?.status === "pending" || ex?.status === "running") && (
          <div className="row">
            <span className="spinner sm" />
            <span>{ex.summary}</span>
          </div>
        )}
        {ex?.status === "success" && (
          <>
            <div className="exec-meta">
              <span className="badge model">⚙ {ex.model}</span>
              {typeof ex.costUsd === "number" && (
                <span className="badge cost">${ex.costUsd.toFixed(4)}</span>
              )}
              {ex.runId && <span className="badge run">run {ex.runId.slice(0, 8)}</span>}
            </div>
            {ex.output && <pre className="output">{ex.output}</pre>}
            {ex.files && ex.files.length > 0 && (
              <div className="row muted">📁 {ex.files.join(", ")}</div>
            )}
          </>
        )}
        {ex?.status === "failed" && (
          <p className="error-text">⚠ {ex.error ?? ex.summary}</p>
        )}
      </Step>
    </div>
  );
}

function Step({
  n,
  title,
  state,
  children,
}: {
  n: number;
  title: string;
  state: "idle" | "running" | "done" | "denied";
  children: React.ReactNode;
  done?: boolean;
}) {
  return (
    <div className={`step step-${state}`}>
      <div className="step-rail">
        <div className="step-dot">{n}</div>
        <div className="step-line" />
      </div>
      <div className="step-body">
        <div className="step-title">{title}</div>
        <div className="step-content">{children}</div>
      </div>
    </div>
  );
}
