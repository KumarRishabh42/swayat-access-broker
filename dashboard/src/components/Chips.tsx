import React from "react";
import { CapabilityScope } from "../types.ts";

const SERVICE_ICONS: Record<string, string> = {
  slack: "💬",
  gmail: "📧",
  email: "📧",
  github: "🐙",
  notion: "📝",
  sap: "🏦",
  calendar: "📅",
  drive: "📁",
  hubspot: "🧲",
};

export function CapabilityChips({
  caps,
  tone = "neutral",
}: {
  caps: CapabilityScope[];
  tone?: "neutral" | "approved" | "denied";
}) {
  if (!caps || caps.length === 0) {
    return <span className="muted">none</span>;
  }
  return (
    <div className="chips">
      {caps.map((c, i) => (
        <div key={i} className={`chip chip-${tone}`}>
          <span className="chip-icon">{SERVICE_ICONS[c.service] ?? "🔌"}</span>
          <span className="chip-service">{c.service}</span>
          <span className="chip-actions">{c.actions.join(", ")}</span>
          {c.resources && c.resources.length > 0 && (
            <span className="chip-res">{c.resources.join(", ")}</span>
          )}
        </div>
      ))}
    </div>
  );
}
