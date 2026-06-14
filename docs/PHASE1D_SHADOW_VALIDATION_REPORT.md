# Phase 1D Shadow Migration Validation Report

## Status

Shadow validation complete.

No migrations were applied to Supabase Dev. No live Supabase tables were
created. No application code was written. No real data was seeded.

## Validation Environment Used

Environment:

- Disposable embedded PostgreSQL-compatible database using
  `@electric-sql/pglite@0.5.1`
- Node.js `v24.11.0`
- Validation workspace: `/tmp/strideo-pglite-validation`
- Repository files remained unchanged except this report

Unavailable local tools:

- Supabase local CLI
- Docker
- `psql`
- local `postgres`/`pg_ctl`

Compatibility setup:

- Created test-only roles: `anon`, `authenticated`, `service_role`,
  `supabase_admin`.
- Created test-only `auth` schema and `auth.users` table.
- Created test-only `auth.uid()` helper returning `null::uuid`.
- Created test-only `public.rls_auto_enable()` helper so
  `0001_security_hardening.sql` could validate revoke/grant behavior.

PGlite compatibility caveat:

- PGlite does not ship Supabase/Postgres extension packages `pgcrypto` or
  `btree_gin`.
- For this disposable validation only, the two `create extension` statements in
  `0002_extensions_and_types.sql` were skipped by the validation runner.
- `gen_random_uuid()` is available in PGlite without installing `pgcrypto`.
- Supabase Dev must still verify `pgcrypto` and `btree_gin` extension creation
  during actual application.

## Migrations Tested

Applied in order to a clean disposable database:

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

## Migration Results

| Migration | Result | Notes |
| --- | --- | --- |
| `0001_security_hardening.sql` | Success | Validated against test-only roles and `rls_auto_enable()` shim. |
| `0002_extensions_and_types.sql` | Success with compatibility caveat | PGlite skipped unavailable `pgcrypto` and `btree_gin` extension statements. Enums and domains applied. |
| `0003_reference_tables.sql` | Success | Reference tables applied. |
| `0004_transaction_tables.sql` | Success | Transaction, partitioned race/entry/odds, and result tables applied. |
| `0005_opportunity_tables.sql` | Success | Strategy and Opportunity aggregate tables applied. |
| `0006_wager_tables.sql` | Success | Wager recommendation, event, leg, and leg-entry tables applied. |
| `0007_user_and_entitlement_tables.sql` | Success | User-owned workflow and entitlement tables applied. |
| `0008_learning_and_performance_tables.sql` | Success | Learning, prediction output, recommendation result, and rollup tables applied. |
| `0009_audit_tables.sql` | Success | Audit tables and late-bound job-run FKs applied. |
| `0010_rls_policies.sql` | Success | RLS policies applied. |
| `0011_indexes_and_partitions.sql` | Success | Default partitions and indexes applied. |
| `0012_data_architecture_and_training_tables.sql` | Success | Archive, feature-store, training, prediction, and live cache tables applied. |

## Errors Found

No migration SQL errors were found after using the disposable PGlite
compatibility setup.

Environment limitation found:

- PGlite cannot install `pgcrypto` or `btree_gin`.

This was not treated as a Strideo migration defect because Supabase/Postgres
supports those extension statements and `0002` is intended for Supabase.

## Fixes Made

No migration files were changed.

No SQL fixes were required.

## Verification Counts

Final disposable database verification:

- Public tables including partition children: 76
- Application tables excluding default partitions: 67
- Default partition tables: 9
- RLS-enabled public tables: 76
- RLS policies: 35
- Foreign keys, including partition-inherited constraints: 230
- Invalid foreign keys: 0
- Explicit non-constraint indexes: 94
- Invalid indexes: 0
- Public enum types: 29
- Public domains: 3
- Broad table grants to `anon`, `authenticated`, or `PUBLIC`: 0
- Public `SECURITY DEFINER` functions: 1
- Public `SECURITY DEFINER` function name: `rls_auto_enable`

Extension count in PGlite:

- `pgcrypto`: 0
- `btree_gin`: 0

Expected Supabase Dev behavior:

- `pgcrypto` and `btree_gin` should be available through Supabase extension
  support.

## Verification Query Areas

Validated:

- Table creation.
- RLS enablement.
- RLS policy count.
- Partition child table count.
- Foreign key validity.
- Index validity.
- Enum and domain existence.
- Absence of broad browser-facing table grants.
- Absence of unexpected `SECURITY DEFINER` functions.

## Required Follow-Up Before Supabase Dev Application

Before applying to Supabase Dev:

- Confirm target project is `strideo-dev`.
- Confirm automatic table exposure remains off.
- Confirm `ensure_rls` and `rls_auto_enable()` remain active and hardened.
- Confirm no application tables exist in Supabase Dev.
- Confirm `pgcrypto` and `btree_gin` extension creation succeeds in Supabase Dev.
- Confirm backup/restore path exists.
- Obtain explicit user approval for live Supabase Dev application.

## Approval For Supabase Dev Application

Approved for Supabase Dev application with caution.

The migration set applied cleanly to the disposable validation database. The only
remaining caveat is environment-specific extension validation for `pgcrypto` and
`btree_gin`, which must be confirmed during Supabase Dev pre-check/application.

Do not apply migrations until explicit execution approval is given.
