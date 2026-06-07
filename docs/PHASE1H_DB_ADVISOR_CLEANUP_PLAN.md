# Phase 1H DB Advisor Cleanup Plan

Status: PLANNING ONLY - NO DATABASE CHANGES MADE

Date: June 7, 2026

## Purpose

Phase 1H plans the next database advisor cleanup pass after:

- Phase 1F applied migrations `0001` through `0012` to Supabase Dev.
- Phase 1G applied `0013_fk_index_hardening` to Supabase Dev.
- Phase 1G verified all `72` FK hardening indexes from `0013`.

This plan does not create or apply migrations. It does not modify RLS policies.

Production remains untouched.

## Sources Reviewed

- `AGENTS.md`
- `docs/PHASE1F_DEV_MIGRATION_EXECUTION_REPORT.md`
- `docs/PHASE1G_DEV_MIGRATION_EXECUTION_REPORT.md`
- `docs/PHASE1G_DEV_PERFORMANCE_ADVISOR_EXPORT.md`
- `docs/PHASE1G_FK_INDEX_REVIEW.md`
- `docs/PHASE1G_DEV_DB_HARDENING_PLAN.md`
- `supabase/migrations/0010_rls_policies.sql`

No Supabase inspection was performed for this planning task. The plan relies on advisor results already documented in the repo.

## Remaining Advisor Categories

### 1. RLS Initplan Warnings

Risk level: medium.

Supabase performance advisors reported `auth_rls_initplan` warnings after Phase 1G. These warnings indicate RLS policies that call `auth.uid()` directly may re-evaluate the function per row. At scale, this can produce unnecessary query cost on user-owned workflow tables.

Local policy review confirms many initial owner policies in `0010_rls_policies.sql` use direct `auth.uid()` expressions.

Recommended action:

- Analyze every advisor-reported policy before changing SQL.
- Prefer the Supabase-recommended pattern of wrapping auth calls as scalar subqueries, for example `(select auth.uid())`.
- Keep the authorization meaning exactly the same.
- Prepare a future append-only RLS optimization migration only after policy-by-policy review.

May need future migration: yes.

May need RLS policy rewrites: yes.

### 2. Deferred Low-Volume Or Reference FK Items

Risk level: low for MVP, potentially medium after workload emerges.

After `0013`, remaining unindexed FK findings were limited to deferred items:

- `model_promotions (previous_model_version_id)`
- `profile_roles (created_by_user_id)`
- `race_entries (jockey_id)`
- `race_entries (trainer_id)`
- `race_entries_default (jockey_id)`
- `race_entries_default (trainer_id)`
- `races (surface_id)`
- `races_default (surface_id)`
- `result_versions (correction_of_result_version_id)`
- `strategies (current_version_id)`
- `strategies (parent_strategy_id)`

Recommended action:

- Defer until real ingestion, search, model promotion, and strategy authoring workload exists.
- Revisit with query plans and advisor output after the first representative workload.
- Prefer query-path indexes over single-column FK indexes when the real access path is composite.

May need future migration: possibly.

May need RLS policy rewrites: no.

### 3. Unused Index Findings

Risk level: low now.

Unused-index findings are expected because the database is newly created and has not accumulated representative ingestion, model, or user workflow traffic. Phase 1G also created new indexes that will naturally appear unused before workload exists.

Recommended action:

- Ignore during Phase 1H.
- Do not remove indexes from a fresh database based on unused-index advisor output.
- Revisit only after representative query statistics exist.

May need future migration: possibly, but only after workload and query statistics justify removing or consolidating indexes.

May need RLS policy rewrites: no.

## Proposed Sequencing

### Phase 1H-A: RLS Initplan Analysis

Goal: produce a policy-by-policy analysis before editing SQL.

Steps:

1. Re-run Supabase Dev performance advisors with explicit authorization.
2. Export the exact `auth_rls_initplan` findings.
3. Map each finding to `0010_rls_policies.sql`.
4. Classify policies by table, operation, and expression shape.
5. Identify any policies that use nested `exists` queries and require extra care.
6. Draft a no-change analysis document with proposed rewrites.

Output:

- A Phase 1H-A analysis doc.
- No migration unless separately authorized.

### Phase 1H-B: Optional RLS Policy Optimization Migration

Goal: safely optimize RLS policies without changing access semantics.

Potential migration shape:

- Append-only migration after `0013`.
- Use `drop policy if exists` plus `create policy` for only the affected policies, or `alter policy` where it can express the change cleanly.
- Replace direct `auth.uid()` calls with `(select auth.uid())`.
- Preserve roles, commands, `using`, and `with check` logic.

This phase should not:

- Disable RLS.
- Add broad grants.
- Open shared Opportunity or recommendation reads.
- Introduce user-editable metadata into authorization.
- Touch production without explicit authorization.

### Phase 1H-C: Deferred FK/Index Review After Workload

Goal: decide whether low-volume/reference FK findings need indexes.

Trigger this phase only after representative workload exists, such as:

- Race ingestion has populated race cards and entries.
- User workflow tables have realistic bet sheet and watchlist activity.
- Strategy/model workflows have produced real promotion and evaluation records.

Recommended process:

1. Re-run performance advisors.
2. Review query plans for racing search, race cards, strategy authoring, and model promotion screens.
3. Add only indexes that match real query paths or advisor-confirmed operational risk.
4. Keep migrations append-only.

### Phase 1H-D: Unused Index Review After Workload

Goal: remove or consolidate unused indexes only when statistics are meaningful.

Do not begin this phase until query statistics reflect real usage.

Recommended process:

1. Capture representative workload window.
2. Re-run performance advisors.
3. Inspect `pg_stat_user_indexes` and query plans.
4. Identify indexes that are unused and not needed for FK enforcement, RLS, common filters, or planned product flows.
5. Prepare a separate migration only if removal is clearly justified.

## Items To Ignore Or Defer Until Workload Exists

Ignore for now:

- All unused-index findings.
- Unused findings for newly created `0013` FK indexes.
- Index removal recommendations from an empty or near-empty database.

Defer:

- Reference lookup FKs such as surface, jockey, and trainer until ingestion/search paths are clear.
- Strategy metadata self-references until strategy authoring workflows exist.
- Model promotion rollback pointers until model promotion workflows exist.
- Admin-created role audit FKs until operator workflow exists.

## Safety Rules For Future RLS Changes

Future RLS work must follow these rules:

- Use Dev only unless production is explicitly authorized in the current task.
- Confirm target project name and ref before any Supabase operation.
- Do not disable RLS.
- Do not add broad grants to `anon` or `authenticated`.
- Do not use user-editable metadata for authorization.
- Do not expose service-role keys or secret keys in browser code.
- Preserve each policy's existing access semantics.
- Keep shared Opportunity and recommendation reads deferred until entitlement tests and grants are reviewed.
- Use append-only migrations.
- Do not modify existing migration files.
- Review SQL before execution.
- Stop on the first migration error.

## Verification Steps For Future RLS Migration

After any future RLS optimization migration is explicitly authorized and applied to Dev:

1. Confirm migration history includes the new append-only migration.
2. Confirm no existing migration files were modified.
3. Count RLS-enabled public tables.
4. Count policies by table and command.
5. Confirm no table grants to `anon` or `authenticated` were introduced unexpectedly.
6. Re-run Supabase security advisors.
7. Re-run Supabase performance advisors.
8. Confirm targeted `auth_rls_initplan` warnings are resolved or documented.
9. Run owner-access smoke tests for user-owned tables when test users exist.
10. Run negative-access checks to confirm users cannot read or mutate another user's rows.
11. Run `npm run lint` and `npm run build` if application code changed.
12. Document results in a Phase 1H execution report.

## Production Reminder

Production remains untouched.

No production advisor execution, migration, policy rewrite, grant change, or verification should occur unless production work is explicitly authorized in the current task.

## Recommendation

Proceed with Phase 1H-A RLS initplan analysis next.

Do not create an RLS migration until the exact advisor findings are exported and mapped to policy-level rewrites. Continue to defer unused-index cleanup and low-volume/reference FK indexes until real workload exists.
