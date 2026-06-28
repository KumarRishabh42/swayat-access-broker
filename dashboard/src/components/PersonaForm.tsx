import React, { useState } from "react";
import { personasApi } from "../api.ts";

const EXAMPLES = [
  { name: "Finance Manager", role: "Reviews and approves vendor invoices, posts summaries to the accounting Slack channel. Cannot issue payments." },
  { name: "Support Agent", role: "Reads and replies to customer support emails and posts updates in the support Slack channel." },
  { name: "Dev On-call", role: "Reads GitHub repos and opens issues for incidents; notifies the engineering Slack channel." },
];

export default function PersonaForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role) return;
    setLoading(true);
    try {
      await personasApi.create(name, role);
      setName("");
      setRole("");
      onCreated();
    } catch (e) {
      alert("Failed to create persona");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="form">
      <label className="field">
        <span>Persona name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Finance Manager"
        />
      </label>

      <label className="field">
        <span>Role description</span>
        <textarea
          value={role}
          onChange={(e) => setRole(e.target.value)}
          rows={4}
          placeholder="What does this persona do? Be specific about what it should and shouldn't touch."
        />
      </label>

      <div className="examples">
        {EXAMPLES.map((ex) => (
          <button
            type="button"
            key={ex.name}
            className="example-pill"
            onClick={() => {
              setName(ex.name);
              setRole(ex.role);
            }}
          >
            {ex.name}
          </button>
        ))}
      </div>

      <button type="submit" className="btn-primary" disabled={loading || !name || !role}>
        {loading ? (
          <>
            <span className="spinner" /> Deriving ceiling…
          </>
        ) : (
          "✨ Create & derive access"
        )}
      </button>
    </form>
  );
}
