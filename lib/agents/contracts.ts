import type { AgentRunContext, AgentRunResult } from "./types";

export interface AgentContract<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  run(input: TInput, context: AgentRunContext): Promise<AgentRunResult<TOutput>>;
}

export function createUnimplementedAgent<TInput = unknown, TOutput = unknown>(
  name: string,
  description: string,
): AgentContract<TInput, TOutput> {
  return {
    name,
    description,
    async run() {
      return {
        status: "failed",
        error:
          "Agent execution is intentionally not implemented during Phase 0.",
      };
    },
  };
}
