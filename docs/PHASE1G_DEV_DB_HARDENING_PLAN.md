# Phase 1G Dev DB Hardening Plan

Status: PLANNED - NO DATABASE CHANGES MADE

Date: June 7, 2026

## Purpose

Phase 1G is the follow-up hardening pass after Phase 1F applied migrations `0001` through `0012` to Supabase Dev.

This plan focuses on reviewing Supabase advisor `INFO` findings and preparing any necessary append-only migration work before ingestion or user workflow volume begins.

Production remains untouched.

## Scope

Included:

- Review Supabase performance advisor `INFO` items.
- Prioritize unindexed foreign key findings.
- Treat unused index findings as expected until workload exists.
- Prepare follow-up index migrations only when justified by advisor output and expected query paths.
- Re-run advisors and schema verification after hardening.

Excluded:

- No production work.
- No migration application without explicit authorization.
- No rewrite, rename, reorder, squash, or deletion of existing migrations.
- No removal of existing indexes based only on unused-index findings from an empty database.

## Advisor Findings To Review

Phase 1F post-execution advisors reported:

- Security advisor: `INFO` findings for RLS-enabled tables with no policies.
- Performance advisor: `INFO` findings for unindexed foreign keys.
- Performance advisor: `INFO` findings for unused indexes.

The security advisor findings are expected for server-owned/reference/audit/model tables because RLS is enabled broadly and browser-facing grants are intentionally deferred.

The performance advisor findings need a separate review because some foreign keys may need covering indexes before ingestion, verification jobs, and user workflows create volume.

## Unindexed Foreign Key Prioritization

Prioritize unindexed foreign keys by operational risk:

1. High-volume transaction and append-only tables:
   - race entries
   - odds snapshots
   - opportunities
   - wager recommendations
   - recommendation results
   - prediction results
   - event and agent logs

2. User workflow tables:
   - daily bet sheet entries
   - daily bet sheet events
   - watchlists
   - recorded wagers
   - user wager results

3. Ingestion and learning lineage:
   - data ingestion batches
   - source data files
   - feature snapshots
   - model training/evaluation tables
   - feature-store tables

4. Low-volume administrative or registry tables:
   - model promotions
   - strategy metadata
   - reference records

For each advisor item, confirm whether an existing composite index already covers the actual planned query path. Add a new index only if the foreign key columns are not covered by an existing useful index prefix.

## Unused Index Guidance

Unused index findings are expected immediately after Phase 1F because:

- The database is newly created.
- Application rows have not been inserted.
- Ingestion jobs have not run.
- User workflows have not created workload.
- Query statistics have not accumulated.

Do not remove indexes based on unused-index findings during Phase 1G.

Revisit unused indexes only after meaningful workload exists and query statistics are representative.

## Follow-Up Migration Process

Any Phase 1G migration must be append-only.

Required process:

1. Re-run Supabase performance advisors against Dev.
2. Export or summarize unindexed foreign key findings without secrets.
3. Group findings by table and expected workload.
4. Check existing indexes for coverage.
5. Draft a new migration with only additive `create index` statements.
6. Prefer explicit index names that identify table and covered columns.
7. Avoid modifying existing migration files.
8. Review SQL before execution.
9. Apply to Dev only after explicit authorization.
10. Stop on first migration error.
11. Re-run advisors and verification.

Use concurrent index creation only if the execution path supports it safely. If using Supabase MCP `apply_migration`, prefer ordinary `create index` statements inside the migration because `create index concurrently` cannot run inside a transaction.

## Recommended Verification After Hardening

After any Phase 1G hardening migration is applied to Dev:

```bash
npm run lint
npm run build
```

Run Supabase verification:

- Confirm the new migration appears in migration history.
- Confirm no existing migrations were modified.
- Count public tables.
- Count RLS-enabled public tables.
- Count policies.
- Count indexes.
- Re-run security advisors.
- Re-run performance advisors.
- Confirm no broad table grants to `anon` or `authenticated` were introduced.
- Confirm production was not touched.

## Production Reminder

Production remains untouched.

Do not create, apply, or test production migrations unless the user explicitly authorizes production work in the current task.

## Final Recommendation

Proceed with a Phase 1G advisor review before building ingestion or product screens that depend on the schema.

The likely first migration should be a narrow append-only index hardening migration that addresses high-priority unindexed foreign keys confirmed by advisor output and expected Strideo access paths.
