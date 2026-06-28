import React, { useState } from "react";
import { Persona } from "../types.ts";
import { personasApi } from "../api.ts";
import { CapabilityChips } from "./Chips.tsx";

export default function PersonaCard({
  persona,
  onChange,
}: {
  persona: Persona;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const recompute = async () => {
    setBusy(true);
    try {
      await personasApi.recompute(persona.id);
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete persona "${persona.name}"?`)) return;
    await personasApi.delete(persona.id);
    onChange();
  };

  const sourceLabel =
    persona.ceilingSource === "ai"
      ? "🤖 AI-derived"
      : persona.ceilingSource === "manual"
      ? "✍️ Manual"
      : "🧩 Heuristic";

  return (
    <div className="persona-card">
      <div className="persona-card-head">
        <h3>{persona.name}</h3>
        <span className={`source-badge ${persona.ceilingSource}`}>{sourceLabel}</span>
      </div>
      <p className="persona-role">{persona.role}</p>

      <div className="ceiling">
        <div className="ceiling-label">Bare-minimum ceiling</div>
        <CapabilityChips caps={persona.ceiling} tone="approved" />
      </div>

      <div className="persona-actions">
        <button className="btn-ghost sm" onClick={recompute} disabled={busy}>
          {busy ? <span className="spinner sm" /> : "↻"} Recompute
        </button>
        <button className="btn-ghost sm danger" onClick={remove}>
          🗑 Delete
        </button>
      </div>
    </div>
  );
}
