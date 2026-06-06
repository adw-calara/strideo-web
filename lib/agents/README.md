# Agent Framework Stubs

Phase 0 defines agent boundaries only. It does not run production agents, call
OpenAI, connect race-data providers, or persist agent output.

Future agents must:

- accept structured inputs
- return structured outputs
- persist inputs, outputs, and run metadata
- respect user authorization and subscription boundaries
- write auditable records to `job_runs`, `agent_logs`, or equivalent tables

Conceptual agents are listed in `PHASE0_PLAN.md` and the architecture docs.
