import React from "react";
import { PolicyDecision, Persona } from "../types.ts";

export default function PolicyHistory({
  decisions,
  personas,
}: {
  decisions: PolicyDecision[];
  personas: Persona[];
}) {
  const nameOf = (id: string) => personas.find((p) => p.id === id)?.name ?? id;

  if (decisions.length === 0) {
    return <div className="empty">No decisions yet.</div>;
  }

  return (
    <div className="timeline">
      {decisions.map((d) => {
        const ex = d.execution;
        return (
          <div key={d.taskId} className={`tl-item ${d.status}`}>
            <div className="tl-marker" />
            <div className="tl-card">
              <div className="tl-head">
                <span className={`status-pill ${d.status}`}>{d.status}</span>
                <span className="tl-persona">{nameOf(d.personaId)}</span>
                <span className="tl-time">
                  {new Date(d.decidedAt).toLocaleString()}
                </span>
              </div>
              <p className="tl-reason">{d.reasoning}</p>
              <div className="tl-foot">
                <span className="muted">
                  proposed {d.proposedCapabilities.length} · approved{" "}
                  {d.approvedCapabilities.length} · denied{" "}
                  {d.deniedCapabilities.length}
                </span>
                {ex && ex.status !== "skipped" && (
                  <span className={`exec-pill ${ex.status}`}>
                    {ex.status === "success" && "✓ executed"}
                    {ex.status === "failed" && "⚠ failed"}
                    {(ex.status === "pending" || ex.status === "running") &&
                      "… running"}
                    {typeof ex.costUsd === "number" &&
                      ` · $${ex.costUsd.toFixed(4)}`}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
