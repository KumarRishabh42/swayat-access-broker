export interface CapabilityScope {
  service: string;
  actions: string[];
  resources?: string[];
}

export interface Persona {
  id: string;
  name: string;
  role: string; // natural-language description of what this persona does
  ceiling: CapabilityScope[]; // LLM-derived bare-minimum allowed set (cached)
  ceilingSource: "ai" | "mock" | "manual";
  ceilingComputedAt: string;
  createdAt: string;
}

export interface TaskRequest {
  id: string;
  personaId: string;
  description: string;
  userPrompt: string;
  submittedAt: string;
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

export interface SubsetCheckResult {
  approved: CapabilityScope[];
  denied: CapabilityScope[];
  isAllowed: boolean;
}
