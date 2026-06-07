# Phase 1F Dev Migration Execution Report

Status: COMPLETE - DEV MIGRATIONS APPLIED

Date: June 7, 2026

## Summary

Phase 1F Supabase Dev migration execution was authorized and completed against the confirmed Strideo Dev project.

All migrations `0001` through `0012` were applied in order through the Supabase MCP connector. Execution stopped on no errors because no migration errors occurred.

Production was not touched.

## Target Project

- Supabase project name: `strideo-dev`
- Supabase project ref: `ntxtakbggtljjbalgris`
- Supabase project URL: `https://ntxtakbggtljjbalgris.supabase.co`
- Database engine: Postgres 17

## Authorization

User authorized:

```text
Authorize Phase 1F migration execution on Supabase dev project strideo-dev / ntxtakbggtljjbalgris. Apply migrations 0001 through 0012 in order. Stop on first error. Do not touch production.
```

## Execution Path

- Tooling: Supabase MCP connector
- Execution method: `apply_migration`
- Target: Dev project only
- Production touched: no
- Secrets printed or stored: no

## Migrations Applied

Applied in order:

1. `0001_security_hardening`
2. `0002_extensions_and_types`
3. `0003_reference_tables`
4. `0004_transaction_tables`
5. `0005_opportunity_tables`
6. `0006_wager_tables`
7. `0007_user_and_entitlement_tables`
8. `0008_learning_and_performance_tables`
9. `0009_audit_tables`
10. `0010_rls_policies`
11. `0011_indexes_and_partitions`
12. `0012_data_architecture_and_training_tables`

Supabase migration history after execution:

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
```

## Verification Results

Read-only verification queries and Supabase MCP inspection confirmed:

- Public base tables: `76`
- RLS-enabled public tables: `76`
- RLS policies: `35`
- Foreign keys: `230`
- Indexes: `259`
- `pgcrypto` installed: yes, version `1.3`
- `btree_gin` installed: yes, version `1.3`
- Public table grants to `anon` or `authenticated`: none found
- Public `SECURITY DEFINER` functions: `public.rls_auto_enable`

`public.rls_auto_enable` existed before the application schema and was handled by `0001_security_hardening`, which revoked execute from `public`, `anon`, and `authenticated`, and granted execute only to `postgres` and `service_role`.

## Advisors

Supabase security advisors were run after migration execution.

Observed security advisor output:

- `INFO` findings for `rls_enabled_no_policy` on many server-owned/reference/audit/model tables.
- This is expected for the current schema posture because RLS is enabled broadly, but browser-facing grants and shared read policies are intentionally deferred until entitlement and RLS policy tests are reviewed.
- User-owned workflow tables and private strategy reads have initial owner policies.
- No broad browser table grants were found in verification.

Supabase performance advisors were run after migration execution.

Observed performance advisor output:

- `INFO` findings for unindexed foreign keys.
- `INFO` findings for unused indexes.
- Unused-index findings are expected immediately after schema creation because no application workload has run.
- Unindexed foreign key findings should be reviewed in the next schema-hardening pass before ingestion or user workflow volume begins.

## Database Changes Made

Created the Phase 1 schema foundation for:

- Supabase security hardening and default privilege posture
- Extensions, private schema, enums, and domains
- Racing reference tables
- Race transaction, entry, odds, and result tables
- Strategy and Opportunity aggregate tables
- Wager recommendation structures
- User identity, entitlement, watchlist, bet sheet, recorded wager, and alert preference tables
- Learning lineage and performance verification tables
- Agent job, audit, and event log tables
- Default partitions and access-path indexes
- Historical archive, feature-store, prediction, and live prediction cache tables
- RLS enablement and initial owner policies

## Data State

- Seed data inserted: none
- Application rows inserted: none
- Public table row counts observed through MCP table listing: `0`

## Remaining Follow-Up

- Review performance advisor unindexed foreign-key findings and create a follow-up append-only migration if needed.
- Keep `rls_enabled_no_policy` findings documented as intentional until browser-facing grants and policy tests are approved.
- Generate Supabase TypeScript types when the application starts consuming the schema.
- Build ingestion only after operational partition strategy and provider endpoint scope are confirmed.

## Final Dev Database Status

Phase 1F migration execution is complete on Supabase Dev.

No production Supabase project was touched.
