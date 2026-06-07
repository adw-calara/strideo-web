# Phase 1G Dev Migration Execution Report

Status: COMPLETE - DEV MIGRATION APPLIED

Date: June 7, 2026

## Summary

Phase 1G FK index hardening was applied to Supabase Dev.

Only migration `0013_fk_index_hardening` was applied. Production was not touched.

## Target Project

- Supabase project name: `strideo-dev`
- Supabase project ref: `ntxtakbggtljjbalgris`
- Database engine: Postgres 17
- Target confirmed before execution: yes
- Production touched: no

## Pre-Execution Gates

- Required local shell Supabase secret names were checked without printing values.
- Local shell environment did not expose the staged secret variables.
- Supabase MCP Dev access was available and used.
- Target project ref was confirmed as `ntxtakbggtljjbalgris`.
- Existing migration history showed `0001` through `0012` applied.
- `0013_fk_index_hardening` was not present before execution.
- Production credentials were not used.

## Migration Applied

Applied:

```text
0013_fk_index_hardening
```

Execution method:

- Tooling: Supabase MCP connector
- Method: `apply_migration`
- Target: Dev project only
- Result: success
- Stop-on-first-error triggered: no error occurred

## Migration History After Execution

Supabase migration history showed:

```text
20260607143207 0001_security_hardening
20260607143238 0002_extensions_and_types
20260607143312 0003_reference_tables
20260607143356 0004_transaction_tables
20260607143452 0005_opportunity_tables
20260607143531 0006_wager_tables
20260607143625 0007_user_and_entitlement_tables
20260607143740 0008_learning_and_performance_tables
20260607143820 0009_audit_tables
20260607143911 0010_rls_policies
20260607144006 0011_indexes_and_partitions
20260607144134 0012_data_architecture_and_training_tables
20260607162142 0013_fk_index_hardening
```

## Verification Results

Read-only verification confirmed:

- Expected indexes from `0013`: `72`
- Found indexes from `0013`: `72`
- Missing indexes: `0`

Local verification:

- No existing migration files were modified locally after execution.
- `git diff --check` passed.
- Pre-existing untracked duplicate/temp files remained uncommitted and untouched.

## Advisor Result After Execution

Supabase Dev performance advisors were re-run after applying `0013`.

Remaining `unindexed_foreign_keys` findings were limited to deferred items already excluded from the Phase 1G migration:

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

Additional advisor output included:

- `auth_rls_initplan` warnings for RLS policies that call auth functions directly.
- `unused_index` findings, including indexes created by `0013`.

These are expected follow-ups:

- RLS initplan optimization should be handled in a separate RLS policy performance pass.
- Unused-index findings should not be acted on until representative ingestion and user workload exists.
- Deferred low-volume/reference FK findings should be revisited when query paths are clearer.

## Database Changes Made

The migration added only `create index if not exists` statements for advisor-confirmed FK hardening.

No tables, columns, policies, schemas, data, RLS settings, grants, or existing indexes were removed or modified by the local migration file.

## Production Reminder

Production was not touched.

No production migration, advisor execution, schema change, or verification occurred in this phase.

## Final Dev Status

Phase 1G FK index hardening is complete on Supabase Dev.

Recommended next step: review and merge PR #16, then plan a separate follow-up for RLS initplan advisor warnings if product scope requires it before user workflow volume.
