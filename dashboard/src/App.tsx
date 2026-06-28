import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import { Persona, PolicyDecision } from "./types.ts";
import { personasApi, auditApi } from "./api.ts";
import PersonaForm from "./components/PersonaForm.tsx";
import PersonaCard from "./components/PersonaCard.tsx";
import TaskSubmitter from "./components/TaskSubmitter.tsx";
import PolicyHistory from "./components/PolicyHistory.tsx";

type Tab = "personas" | "run" | "audit";

export default function App() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [decisions, setDecisions] = useState<PolicyDecision[]>([]);
  const [tab, setTab] = useState<Tab>("personas");

  const loadPersonas = useCallback(async () => {
    try {
      setPersonas(await personasApi.getAll());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadDecisions = useCallback(async () => {
    try {
      setDecisions(await auditApi.getAll());
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadPersonas();
    loadDecisions();
  }, [loadPersonas, loadDecisions]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">🛡️</span>
          <div>
            <h1>Capability Broker</h1>
            <p>Least-privilege access for AI agents · powered by Evolve</p>
          </div>
        </div>
        <a
          className="dash-link"
          href="https://dashboard.evolvingmachines.ai"
          target="_blank"
          rel="noreferrer"
        >
          Evolve Dashboard ↗
        </a>
      </header>

      <nav className="tabs">
        <button className={tab === "personas" ? "tab active" : "tab"} onClick={() => setTab("personas")}>
          <span>👤</span>Personas
        </button>
        <button className={tab === "run" ? "tab active" : "tab"} onClick={() => setTab("run")}>
          <span>⚡</span>Run Task
        </button>
        <button className={tab === "audit" ? "tab active" : "tab"} onClick={() => setTab("audit")}>
          <span>📜</span>Audit Log
        </button>
      </nav>

      <main className="main">
        {tab === "personas" && (
          <div className="grid-2">
            <section className="panel">
              <h2>Create persona</h2>
              <p className="panel-sub">
                Describe the role. The cheapest model derives the
                <strong> bare-minimum capability ceiling</strong> and caches it.
              </p>
              <PersonaForm onCreated={loadPersonas} />
            </section>

            <section className="panel">
              <h2>Personas ({personas.length})</h2>
              <p className="panel-sub">Each persona's cached access ceiling.</p>
              <div className="persona-list">
                {personas.length === 0 && (
                  <div className="empty">No personas yet — create one →</div>
                )}
                {personas.map((p) => (
                  <PersonaCard key={p.id} persona={p} onChange={loadPersonas} />
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "run" && (
          <TaskSubmitter
            personas={personas}
            onSettled={loadDecisions}
          />
        )}

        {tab === "audit" && (
          <section className="panel">
            <div className="panel-head">
              <h2>Audit log</h2>
              <button className="btn-ghost" onClick={loadDecisions}>
                ↻ Refresh
              </button>
            </div>
            <PolicyHistory decisions={decisions} personas={personas} />
          </section>
        )}
      </main>
    </div>
  );
}
