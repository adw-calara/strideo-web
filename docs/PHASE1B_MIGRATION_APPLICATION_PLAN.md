# Phase 1B Migration Application Plan

## Status

Planning only.

Do not apply migrations until this plan is reviewed and separately approved for
execution.

## Guardrails

- Apply only to the Supabase dev project.
- Do not apply to production.
- Do not expose `service_role`.
- Do not write application UI.
- Do not connect The Racing API.
- Do not connect OpenAI.
- Do not seed real data.
- Stop immediately if any migration or verification step fails.

## Pre-Application Checklist

Before executing any migration against Supabase dev:

- Confirm the target Supabase project is `strideo-dev`.
- Confirm the project URL is the dev project URL.
- Confirm automatic table exposure is off.
- Confirm `public.ensure_rls` event trigger is active.
- Confirm `public.rls_auto_enable()` exists and is not executable by `public`,
  `anon`, or `authenticated`.
- Confirm no Strideo application tables currently exist in `public`.
- Confirm no tables or functions are currently exposed through the Data API
  unless explicitly expected from platform/system objects.
- Confirm no secrets are committed.
- Confirm `.env.local` is not committed.
- Confirm local branch is updated from `origin/main`.
- Confirm PR #5 is merged.
- Confirm the migration files available locally are exactly:
  `0001_security_hardening.sql` through
  `0012_data_architecture_and_training_tables.sql`.
- Confirm a dev database backup/snapshot or restore path exists before
  applying migrations.

## Migration Application Order

Apply in numeric order:

1. `supabase/migrations/20260607143207_0001_security_hardening.sql`
2. `supabase/migrations/20260607143238_0002_extensions_and_types.sql`
3. `supabase/migrations/20260607143312_0003_reference_tables.sql`
4. `supabase/migrations/20260607143356_0004_transaction_tables.sql`
5. `supabase/migrations/20260607143452_0005_opportunity_tables.sql`
6. `supabase/migrations/20260607143531_0006_wager_tables.sql`
7. `supabase/migrations/20260607143625_0007_user_and_entitlement_tables.sql`
8. `supabase/migrations/20260607143740_0008_learning_and_performance_tables.sql`
9. `supabase/migrations/20260607143820_0009_audit_tables.sql`
10. `supabase/migrations/20260607143911_0010_rls_policies.sql`
11. `supabase/migrations/20260607144006_0011_indexes_and_partitions.sql`
12. `supabase/migrations/20260607144134_0012_data_architecture_and_training_tables.sql`

Do not skip migrations. Do not reorder migrations.

## Verification After Each Migration

After each migration:

- Confirm the migration completed successfully.
- Record the migration file name, start time, finish time, and execution result.
- Confirm expected tables were created for that migration.
- Confirm no unexpected public tables were created.
- Confirm RLS is enabled for any new application tables created by that
  migration, either by the migration itself or by the `ensure_rls` event trigger.
- Confirm no broad grants exist for `anon`, `authenticated`, or `public`.
- Confirm no tables are exposed through the Data API unless intentionally
  exposed in a reviewed grant plan.
- Confirm no new `SECURITY DEFINER` functions exist except the previously
  reviewed `public.rls_auto_enable()` helper.
- Confirm indexes created by the migration exist.
- Confirm partition tables are created correctly when applicable.
- Confirm foreign keys are valid and not marked invalid.
- Capture verification query output for the PR summary.

Migration-specific checks:

- After `0001`, verify default privileges, `rls_auto_enable()` permissions, and
  the `ensure_rls` event trigger.
- After `0002`, verify extensions, `private` schema, enums, and domains.
- After `0003`, verify reference tables.
- After `0004`, verify partitioned race/entry/odds tables and result-version
  relationships.
- After `0005`, verify Opportunity, strategy, subject, event, score, and
  explanation tables.
- After `0006`, verify normalized wager recommendations, legs, leg entries, and
  recommendation events.
- After `0007`, verify user-owned tables include `user_id` and owner-scoped
  composite foreign keys.
- After `0008`, verify learning lineage, model, prediction output,
  recommendation result, and rollup tables.
- After `0009`, verify audit tables and late-bound `source_job_run_id` foreign
  keys.
- After `0010`, verify RLS policies and no browser-facing audit/profile/strategy
  write policies.
- After `0011`, verify default partitions and indexes.
- After `0012`, verify archive metadata, feature-store, prediction-run,
  prediction-result, and live prediction cache tables.

## Supabase MCP Execution Plan

Execution should use Supabase MCP against the dev project only.

Planned process:

1. Select and confirm the `strideo-dev` Supabase project.
2. Run pre-application verification queries.
3. Apply each migration file in numeric order using the Supabase migration
   application tool.
4. Run verification queries after each migration.
5. Stop immediately on the first failure.
6. Record each migration result and verification output.
7. Run final Supabase advisor checks.
8. Produce a results PR containing:
   - migration execution status
   - verification query output
   - table counts
   - RLS status
   - grant status
   - partition status
   - index status
   - foreign-key status
   - any warnings or failures

Output to record:

- Current Supabase project ID/name.
- Current database schema table list before application.
- Migration result for each file.
- RLS-enabled table list.
- Role grants for `public`, `anon`, and `authenticated`.
- Data API exposed table/function list.
- Partition parent and child table list.
- Invalid foreign key or invalid index checks.
- Supabase advisor output.

## Failure And Rollback Plan

If a migration fails:

- Stop immediately.
- Do not continue to the next migration.
- Capture the exact migration file, statement, error message, and timestamp.
- Capture the database object state after failure.
- Record whether the failed migration ran inside a transaction and whether
  partial objects remain.
- Open an issue or PR documenting the failure.
- Decide whether the safe path is:
  - a forward corrective migration, or
  - restoring the dev database from backup/snapshot.

Do not attempt ad hoc manual repairs in the Supabase dashboard.

Rollback considerations:

- Treat applied migrations as forward-only whenever possible.
- Prefer restoring the dev project only if a failure leaves the database in an
  inconsistent state and a forward correction is unsafe.
- Never roll back production because this plan does not authorize production
  application.

## Post-Application Checklist

After all migrations and verification pass:

- Generate a schema snapshot.
- Generate Supabase type definitions.
- Save verification query output.
- Save Supabase advisor output.
- Update migration application documentation with actual results.
- Open a PR with:
  - schema snapshot
  - generated types
  - verification results
  - any follow-up tasks
- Do not seed real data.
- Do not grant browser access.
- Do not start application feature work until Phase 1B results are approved.

## Approval Gate

This document is not execution approval.

Phase 1B execution may begin only after:

- this plan is reviewed,
- the readiness review is approved,
- the target dev project is reconfirmed,
- and the user explicitly authorizes migration application.
