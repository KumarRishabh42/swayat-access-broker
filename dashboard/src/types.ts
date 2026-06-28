export interface CapabilityScope {
  service: string;
  actions: string[];
  resources?: string[];
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  ceiling: CapabilityScope[];
  ceilingSource: "ai" | "mock" | "manual";
  ceilingComputedAt: string;
  createdAt: string;
}

export type ExecutionStatus =
  | "skipped"
  | "pending"
  | "running"
  | "success"
  | "failed";

export interface ExecutionResult {
  status: ExecutionStatus;
  summary: string;
  output?: string;
  files?: string[];
  runId?: string;
  sessionId?: string;
  model?: string;
  costUsd?: number;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface PolicyDecision {
  taskId: string;
  personaId: string;
  status: "approved" | "denied";
  proposedCapabilities: CapabilityScope[];
  approvedCapabilities: CapabilityScope[];
  deniedCapabilities: CapabilityScope[];
  reasoning: string;
  proposalSource: "ai" | "mock";
  decidedAt: string;
  execution?: ExecutionResult;
}

export interface Task {
  id: string;
  personaId: string;
  description: string;
  userPrompt: string;
  submittedAt: string;
}
