import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Persona, TaskRequest, PolicyDecision } from "./types.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "../data");
const personasFile = path.join(dataDir, "personas.json");
const tasksFile = path.join(dataDir, "tasks.json");
const decisionsFile = path.join(dataDir, "decisions.json");

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load or create files
const ensureFile = (file: string) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify([]));
  }
};

ensureFile(personasFile);
ensureFile(tasksFile);
ensureFile(decisionsFile);

const readJSON = (file: string) => JSON.parse(fs.readFileSync(file, "utf-8"));
const writeJSON = (file: string, data: any) =>
  fs.writeFileSync(file, JSON.stringify(data, null, 2));

export const personaDB = {
  create: (persona: Persona) => {
    const personas = readJSON(personasFile);
    personas.push(persona);
    writeJSON(personasFile, personas);
    return persona;
  },

  getAll: (): Persona[] => readJSON(personasFile),

  getById: (id: string): Persona | null => {
    const personas = readJSON(personasFile);
    return personas.find((p: Persona) => p.id === id) || null;
  },

  update: (id: string, updates: Partial<Persona>) => {
    const personas = readJSON(personasFile);
    const idx = personas.findIndex((p: Persona) => p.id === id);
    if (idx >= 0) {
      personas[idx] = { ...personas[idx], ...updates };
      writeJSON(personasFile, personas);
    }
  },

  delete: (id: string) => {
    const personas = readJSON(personasFile);
    writeJSON(
      personasFile,
      personas.filter((p: Persona) => p.id !== id)
    );
  },
};

export const taskDB = {
  create: (task: TaskRequest) => {
    const tasks = readJSON(tasksFile);
    tasks.push(task);
    writeJSON(tasksFile, tasks);
    return task;
  },

  getById: (id: string): TaskRequest | null => {
    const tasks = readJSON(tasksFile);
    return tasks.find((t: TaskRequest) => t.id === id) || null;
  },

  getByPersona: (personaId: string): TaskRequest[] => {
    const tasks = readJSON(tasksFile);
    return tasks.filter((t: TaskRequest) => t.personaId === personaId);
  },
};

export const decisionDB = {
  create: (decision: PolicyDecision) => {
    const decisions = readJSON(decisionsFile);
    decisions.push(decision);
    writeJSON(decisionsFile, decisions);
    return decision;
  },

  getByTaskId: (taskId: string): PolicyDecision | null => {
    const decisions = readJSON(decisionsFile);
    return decisions.find((d: PolicyDecision) => d.taskId === taskId) || null;
  },

  update: (taskId: string, patch: Partial<PolicyDecision>) => {
    const decisions = readJSON(decisionsFile);
    const idx = decisions.findIndex((d: PolicyDecision) => d.taskId === taskId);
    if (idx >= 0) {
      decisions[idx] = { ...decisions[idx], ...patch };
      writeJSON(decisionsFile, decisions);
      return decisions[idx];
    }
    return null;
  },

  getByPersona: (personaId: string): PolicyDecision[] => {
    const decisions = readJSON(decisionsFile);
    return decisions.filter((d: PolicyDecision) => d.personaId === personaId);
  },

  getAll: (): PolicyDecision[] => {
    const decisions = readJSON(decisionsFile);
    return decisions.sort(
      (a: PolicyDecision, b: PolicyDecision) =>
        new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime()
    );
  },
};
