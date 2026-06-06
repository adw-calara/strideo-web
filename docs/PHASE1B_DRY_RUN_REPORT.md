# Phase 1B Migration Dry Run Report

## Status

Dry run complete.

No migrations were applied. No live Supabase tables were created. No
application code was written.

## Important Repository State Note

The dry-run request stated that PR #6 had been merged. GitHub still showed PR #6
as open during this dry run, so this branch was based on the PR #6 branch to
review the required Phase 1B planning documents.

If PR #6 is merged before this dry-run PR, retarget this PR to `main`.

## Validation Method Used

Validation was local/static only.

Available local tooling:

- `psql`: not available
- `postgres`: not available
- `pg_ctl`: not available
- Python `pglast`: not available
- Python `sqlparse`: not available
- Node `pgsql-ast-parser`: not available
- Node `node-sql-parser`: not available

Validation performed:

- Reviewed `docs/PHASE1B_MIGRATION_APPLICATION_PLAN.md`.
- Reviewed `docs/PHASE1B_APPLICATION_READINESS_REVIEW.md`.
- Reviewed migration files `0001` through `0012`.
- Ran structural SQL checks for balanced parentheses and transaction wrappers.
- Validated migration numeric ordering.
- Validated duplicate table, type, domain, index, and policy detection.
- Validated foreign key references resolve to known created tables or approved
  external Supabase tables such as `auth.users`.
- Validated RLS policy targets reference known tables.
- Validated index targets reference known tables.
- Validated partition children reference known partition parents.
- Validated every created table has RLS enabled in the migration design.
- Scanned for broad grants, `SECURITY DEFINER`, and migration application calls.

Because no PostgreSQL parser or local PostgreSQL server was available, this dry
run does not replace a local/shadow database execution test.

## Migration Files Reviewed

- `supabase/migrations/0001_security_hardening.sql`
- `supabase/migrations/0002_extensions_and_types.sql`
- `supabase/migrations/0003_reference_tables.sql`
- `supabase/migrations/0004_transaction_tables.sql`
- `supabase/migrations/0005_opportunity_tables.sql`
- `supabase/migrations/0006_wager_tables.sql`
- `supabase/migrations/0007_user_and_entitlement_tables.sql`
- `supabase/migrations/0008_learning_and_performance_tables.sql`
- `supabase/migrations/0009_audit_tables.sql`
- `supabase/migrations/0010_rls_policies.sql`
- `supabase/migrations/0011_indexes_and_partitions.sql`
- `supabase/migrations/0012_data_architecture_and_training_tables.sql`

## Validation Results

Summary:

- Migration order: pass.
- Structural SQL checks: pass.
- Duplicate object detection: pass.
- Foreign key dependency validation: pass.
- Enum/type dependency validation: pass by file order and object references.
- RLS policy reference validation: pass.
- Index reference validation: pass.
- Partition reference validation: pass.
- RLS coverage validation: pass.
- Broad grant scan: pass.
- `SECURITY DEFINER` scan: pass for new application migrations.
- Live Supabase application: not performed.

Counts validated:

- Created public tables including default partitions: 76
- Application tables excluding default partitions: 67
- Default partition tables: 9
- Types: 29
- Domains: 3
- RLS policies: 35
- Indexes: 94

## Syntax Issues Found

No structural syntax issues were found.

Limitations:

- PostgreSQL parser-backed syntax validation was not available locally.
- Executable syntax validation must be performed in a local/shadow PostgreSQL
  environment before applying to Supabase dev.

## Dependency Issues Found

No unresolved migration-order dependency issues were found.

Notes:

- `0001_security_hardening.sql` depends on the existing
  `public.rls_auto_enable()` helper and `ensure_rls` trigger previously created
  in the Supabase dev project. The Phase 1B application plan correctly requires
  confirming those preconditions before application.
- `auth.users` is an expected Supabase external dependency.
- `extensions` schema availability is an expected Supabase environment
  dependency for extension installation.

## FK Issues Found

No foreign key issues were found by static dependency validation.

Validated:

- User-owned child tables use owner-scoped composite references.
- Race-date sensitive relationships use composite race/date references.
- Prediction results and live prediction cache references resolve.
- Feature-store lineage references resolve.

## RLS Issues Found

No RLS target issues were found.

Validated:

- Every created table has RLS enabled in the migration design.
- RLS policies reference existing tables.
- No user-facing `event_log` policy exists.
- Direct browser write policies for `profiles`, `strategies`, and
  `strategy_versions` remain absent.
- `0012` data architecture tables have RLS enabled and no browser-facing
  policies.

## Partition Issues Found

No partition reference issues were found.

Validated partition children:

- `races_default`
- `race_entries_default`
- `odds_snapshots_default`
- `opportunities_default`
- `wager_recommendations_default`
- `recommendation_results_default`
- `agent_logs_default`
- `event_log_default`
- `prediction_results_default`

## Index Issues Found

No index target issues were found.

All 94 indexes target tables created by the migration design.

## Grant And Security Function Findings

No broad grants were found in application migrations.

The only executable grants found are in `0001_security_hardening.sql`:

- `grant execute on function public.rls_auto_enable() to postgres`
- `grant execute on function public.rls_auto_enable() to service_role`

Those grants are intentional and were part of the prior Supabase security
hardening design.

No new `SECURITY DEFINER` functions are created in migrations `0002` through
`0012`.

## Required Fixes

No migration design fixes are required from this dry run.

Required before Supabase dev application:

- Run a parser-backed or local/shadow PostgreSQL execution validation.
- Confirm the Supabase dev pre-application checklist.
- Confirm PR #6 is merged or retarget this PR after PR #6 merges.
- Obtain explicit user approval before applying migrations.

## Ready For Supabase Dev Application Approval

Yes, with execution-gate caveats.

The migration design is ready for Supabase dev application approval after:

1. PR #6 is merged or this PR is retargeted to `main`.
2. A local/shadow PostgreSQL execution test is completed or explicitly waived.
3. The Supabase dev pre-application checklist passes.
4. The user explicitly approves migration application.

Do not apply migrations yet.
