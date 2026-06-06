# Phase 1C Migration Execution Approval

## Status

Approved with caution.

APPROVED FOR DEV DATABASE EXECUTION.

This approval is limited to the Supabase dev project and does not authorize
production execution, application code, external racing API integration, OpenAI
integration, or real data seeding.

## Executable Validation Caveat

Phase 1B dry-run validation was local/static only. A local PostgreSQL server,
`psql`, and PostgreSQL parser libraries were not available, so executable SQL
validation was not performed.

Execution may proceed only if one of the following is true:

1. A shadow/local database execution validation is completed before Supabase dev
   application, or
2. the project owner explicitly waives shadow execution validation and accepts
   the risk of first executable validation occurring in Supabase dev.

If neither condition is met, execution is blocked until executable shadow DB
validation is performed.

## Review Scope

Reviewed:

- `PRD.md`
- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/SUPABASE_SECURITY.md`
- `PHASE1_SCHEMA_PLAN_V2.md`
- `PHASE1_SCHEMA_APPROVAL.md`
- `docs/MIGRATION_REVIEW.md`
- `docs/PHASE1A_FINAL_APPROVAL.md`
- `docs/PHASE1B_MIGRATION_APPLICATION_PLAN.md`
- `docs/PHASE1B_APPLICATION_READINESS_REVIEW.md`
- `docs/PHASE1B_DRY_RUN_REPORT.md`
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

## Final Execution Checklist

Before execution:

- Confirm the target project is Supabase dev only: `strideo-dev`.
- Confirm the project ref is `ntxtakbggtljjbalgris`.
- Confirm PR #5, PR #6, and PR #7 are merged into `main`.
- Confirm local branch is updated from latest `origin/main`.
- Confirm migration files `0001` through `0012` are present and unchanged.
- Confirm no `.env.local`, service-role key, API key, database password, or
  private credential is committed.
- Confirm no application code changes are included in the execution work.
- Confirm a dev backup, snapshot, or restore path exists.
- Confirm either shadow DB execution validation has passed or the owner has
  explicitly waived that gate.
- Confirm the user has explicitly authorized migration execution after this
  approval PR.

## Supabase Dev Pre-Checks

Run and record evidence before applying any migration:

- Confirm Supabase project name and ref.
- Confirm automatic table exposure is off.
- Confirm Data API exposes no Strideo application tables.
- Confirm no Strideo application tables currently exist in `public`.
- Confirm `public.ensure_rls` event trigger is active.
- Confirm `public.rls_auto_enable()` exists.
- Confirm `public.rls_auto_enable()` execute is revoked from `public`, `anon`,
  and `authenticated`.
- Confirm `public.rls_auto_enable()` execute is limited to privileged roles such
  as `postgres` and `service_role`.
- Confirm no broad default privileges grant future table, sequence, or function
  access to `anon` or `authenticated`.
- Confirm no unexpected public functions are exposed through RPC/Data API.

## Migration Execution Order

Apply in exact numeric order:

1. `supabase/migrations/0001_security_hardening.sql`
2. `supabase/migrations/0002_extensions_and_types.sql`
3. `supabase/migrations/0003_reference_tables.sql`
4. `supabase/migrations/0004_transaction_tables.sql`
5. `supabase/migrations/0005_opportunity_tables.sql`
6. `supabase/migrations/0006_wager_tables.sql`
7. `supabase/migrations/0007_user_and_entitlement_tables.sql`
8. `supabase/migrations/0008_learning_and_performance_tables.sql`
9. `supabase/migrations/0009_audit_tables.sql`
10. `supabase/migrations/0010_rls_policies.sql`
11. `supabase/migrations/0011_indexes_and_partitions.sql`
12. `supabase/migrations/0012_data_architecture_and_training_tables.sql`

Do not skip, reorder, combine, or manually edit migrations during execution.

## Verification After Each Migration

After every migration:

- Confirm the migration completed successfully.
- Record start time, finish time, migration file, and result.
- Confirm expected objects were created.
- Confirm no unexpected public objects were created.
- Confirm all newly created public application tables have RLS enabled.
- Confirm no broad grants exist for `public`, `anon`, or `authenticated`.
- Confirm no new browser-facing table or function exposure exists through the
  Data API unless intentionally documented.
- Confirm no new `SECURITY DEFINER` functions exist except the previously
  reviewed `public.rls_auto_enable()` helper.
- Confirm foreign keys are valid.
- Confirm indexes are valid.
- Confirm partition parents and children are valid when applicable.
- Save verification query output.

Migration-specific verification:

- After `0001`: default privileges, `rls_auto_enable()` permissions, and
  `ensure_rls` trigger.
- After `0002`: extensions, `private` schema, enums, and domains.
- After `0003`: reference tables.
- After `0004`: race, entry, odds, and result-version tables.
- After `0005`: strategy and Opportunity aggregate tables.
- After `0006`: system wager recommendation tables and normalized legs.
- After `0007`: user-owned workflow tables and owner-scoped composite FKs.
- After `0008`: learning, prediction output, performance, and rollup tables.
- After `0009`: audit tables and late-bound job-run lineage FKs.
- After `0010`: RLS policies and no browser-facing audit/profile/strategy write
  policies.
- After `0011`: default partitions and indexes.
- After `0012`: archive metadata, source files, feature store, prediction runs,
  prediction results, and live prediction cache.

## Required Stop Conditions

Stop immediately if any of the following occurs:

- The selected Supabase project is not `strideo-dev`.
- Automatic table exposure is on and cannot be disabled or confirmed safe.
- Existing Strideo application tables are found before migration application.
- `ensure_rls` or `rls_auto_enable()` is missing or incorrectly permissioned.
- A migration fails.
- A migration partially applies outside its transaction.
- A verification query fails.
- RLS is not enabled on a newly created application table.
- A broad grant appears for `public`, `anon`, or `authenticated`.
- A new unintended `SECURITY DEFINER` function appears.
- Data API exposes an unintended table or function.
- A foreign key, index, or partition is invalid.
- Any secret or service-role value is exposed in logs, output, or files.

Do not continue after a stop condition without documenting the issue and
receiving explicit approval for a corrective path.

## Rollback And Failure Plan

If execution fails:

- Stop immediately.
- Do not apply later migrations.
- Capture the failing migration file, statement, error, timestamp, and database
  state.
- Record whether the migration transaction fully rolled back.
- Record any partial objects or side effects.
- Open a results/failure PR with evidence.
- Prefer a forward corrective migration if the database remains consistent.
- Restore from the dev backup/snapshot only if the database is inconsistent and
  a forward correction is unsafe.

Do not perform ad hoc dashboard repairs. Do not apply production changes.

## Post-Application Verification

After all migrations pass:

- Generate a schema snapshot.
- Generate Supabase type definitions.
- Run Supabase advisor checks.
- Verify table counts:
  - 67 application tables
  - 9 default partition tables
  - 35 RLS policies
  - 94 indexes
- Verify every public application table has RLS enabled.
- Verify no broad browser-facing grants exist.
- Verify Data API exposure remains intentionally empty for application tables.
- Verify all partition parents and default partitions exist.
- Verify owner-scoped user workflow FKs.
- Verify race-date composite FKs.
- Verify prediction history and live prediction cache constraints.
- Verify no real seed data exists.

## Required Documentation Updates After Execution

Open a post-application PR with:

- Migration execution log.
- Verification query output.
- Supabase advisor output.
- Schema snapshot.
- Generated Supabase type definitions.
- Any deviations from the plan.
- Any warnings, failures, or manual decisions.
- Confirmation that no real data was seeded.
- Confirmation that no browser grants were added.
- Confirmation that no application code was written.

## Risks

- Executable SQL validation was not available locally during Phase 1B dry run.
- First executable validation may occur in Supabase dev if shadow DB validation
  is explicitly waived.
- The migration set is large and should be applied slowly with verification
  after each file.
- Monthly partition automation is not implemented.
- Feature materialization, archive lifecycle, model retraining, and prediction
  serving jobs are not implemented.
- Browser grants and RLS policy tests remain deferred.
- Generated types and schema snapshot do not exist until after application.
- Provider identity reconciliation remains future work.

## Final Approval Decision

Approved with caution for Supabase dev database execution.

This approval remains conditional on:

- dev-only target confirmation,
- pre-check success,
- backup/restore readiness,
- either shadow DB validation or explicit owner waiver,
- and explicit user authorization to execute migrations.

APPROVED FOR DEV DATABASE EXECUTION.
