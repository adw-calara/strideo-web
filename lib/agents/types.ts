export type AgentName =
  | "race-data"
  | "horse-intelligence"
  | "prediction"
  | "value"
  | "strategy"
  | "wager-construction"
  | "race-analyst"
  | "alert"
  | "bet-sheet"
  | "performance-verification"
  | "strideo-intelligence"
  | "strideo-assistant";

export type AgentRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface AgentRunContext {
  runId: string;
  agentName: AgentName;
  requestedByUserId?: string;
  correlationId?: string;
  createdAt: string;
}

export interface AgentRunResult<TOutput = unknown> {
  status: AgentRunStatus;
  output?: TOutput;
  error?: string;
  completedAt?: string;
}
