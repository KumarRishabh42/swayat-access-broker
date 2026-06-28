import axios from "axios";
import { Persona, Task, PolicyDecision } from "./types.ts";

const API_URL = "http://localhost:3001/api";
const client = axios.create({ baseURL: API_URL, timeout: 60000 });

export const personasApi = {
  getAll: () => client.get<Persona[]>("/personas").then((r) => r.data),
  // Create from name + role; backend derives the ceiling via cheap LLM.
  create: (name: string, role: string) =>
    client.post<Persona>("/personas", { name, role }).then((r) => r.data),
  recompute: (id: string) =>
    client.post<Persona>(`/personas/${id}/recompute`).then((r) => r.data),
  delete: (id: string) => client.delete(`/personas/${id}`),
};

export const tasksApi = {
  submit: (
    personaId: string,
    description: string,
    userPrompt: string,
    execute: boolean
  ) =>
    client
      .post<{ task: Task; decision: PolicyDecision }>("/tasks", {
        personaId,
        description,
        userPrompt,
        execute,
      })
      .then((r) => r.data),
  getDecision: (taskId: string) =>
    client.get<PolicyDecision>(`/decisions/${taskId}`).then((r) => r.data),
};

export const auditApi = {
  getAll: () => client.get<PolicyDecision[]>("/audit-log").then((r) => r.data),
};
