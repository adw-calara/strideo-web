# Phase 1E Dev Migration Execution Plan

## Status

Final execution plan before touching Supabase Dev.

Do not apply migrations until the user explicitly approves execution.

## Guardrails

- Apply only to Supabase Dev: `strideo-dev`.
- Do not apply to production.
- Do not expose `service_role`.
- Do not commit secrets.
- Do not write application UI.
- Do not connect The Racing API.
- Do not connect OpenAI.
- Do not seed real data.
- Stop on the first error.

## Pre-Execution Verification

Before applying any migration, verify and record evidence for each item.

### Project And Repository

- Confirm Supabase project name is `strideo-dev`.
- Confirm Supabase project ref is `ntxtakbggtljjbalgris`.
- Confirm the project is dev only.
- Confirm local branch is updated from latest `origin/main`.
- Confirm migrations `0001` through `0012` are on latest `main`.
- Confirm no migration files differ from `main`.
- Confirm no `.env.local`, service-role key, database URL, API key, or private
  credential is committed.

### Supabase Dev Security

- Confirm automatic exposure of new tables is off.
- Confirm no Strideo application tables currently exist in `public`.
- Confirm no Strideo application tables or functions are exposed through Data
  API.
- Confirm `service_role` is not exposed to browser code, public env vars, logs,
  documentation, or committed files.
- Confirm `public.ensure_rls` event trigger is active.
- Confirm `public.rls_auto_enable()` exists.
- Confirm `public.rls_auto_enable()` execute is revoked from `public`, `anon`,
  and `authenticated`.
- Confirm default privileges do not grant future table, sequence, or function
  access to `anon` or `authenticated`.

### Extension Readiness

Phase 1D shadow validation used PGlite, which could not install Supabase
extensions. Supabase Dev must verify:

- `pgcrypto` can be created in schema `extensions`.
- `btree_gin` can be created in schema `extensions`.
- `gen_random_uuid()` is available.

If either extension creation fails, stop before continuing past
`0002_extensions_and_types.sql`.

## Execution Approach

Use Supabase MCP against `strideo-dev` only.

Execution rules:

- Apply migrations one at a time.
- Apply in exact numeric order.
- Stop on first error.
- Do not skip migrations.
- Do not reorder migrations.
- Do not manually edit migration SQL during execution.
- Record output after each migration.
- Run verification after each migration.
- Do not continue if verification fails.

Migration order:

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

## Verification Queries After Execution

Run these after all migrations apply. During execution, run the relevant subset
after each migration.

### Table Count

```sql
select
  count(*) filter (where c.relkind in ('r', 'p')) as public_table_count,
  count(*) filter (where c.relkind in ('r', 'p') and i.inhrelid is not null) as public_partition_child_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_inherits i on i.inhrelid = c.oid
where n.nspname = 'public'
  and c.relkind in ('r', 'p');
```

Expected:

- Public tables including partition children: `76`
- Default partition tables: `9`

### RLS Count

```sql
select count(*) as rls_enabled_public_tables
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relrowsecurity;
```

Expected: `76`

### Policy Count

```sql
select count(*) as public_policy_count
from pg_policies
where schemaname = 'public';
```

Expected: `35`

### FK Count

```sql
select
  count(*) as public_fk_count,
  count(*) filter (where not c.convalidated) as invalid_fk_count
from pg_constraint c
join pg_namespace n on n.oid = c.connamespace
where n.nspname = 'public'
  and c.contype = 'f';
```

Expected:

- Invalid FK count: `0`
- FK count may include partition-inherited constraints; record the observed
  value.

### Index Count

```sql
select
  count(*) filter (
    where c.relname not like '%_pkey'
      and c.relname not like '%_key'
  ) as explicit_index_count,
  count(*) filter (where not i.indisvalid) as invalid_index_count
from pg_index i
join pg_class c on c.oid = i.indexrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public';
```

Expected:

- Explicit non-constraint indexes: `94`
- Invalid indexes: `0`

### Extension And Type Existence

```sql
select extname
from pg_extension
where extname in ('pgcrypto', 'btree_gin')
order by extname;
```

Expected: `btree_gin`, `pgcrypto`

```sql
select
  count(*) filter (where t.typtype = 'e') as public_enum_count,
  count(*) filter (where t.typtype = 'd') as public_domain_count
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public';
```

Expected:

- Enums: `29`
- Domains: `3`

### Broad Grants Check

```sql
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by grantee, table_name, privilege_type;
```

Expected: no application-table rows.

### SECURITY DEFINER Check

```sql
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname;
```

Expected:

- `rls_auto_enable`
- No other public `SECURITY DEFINER` functions.

### Exposed Tables And Functions Check

Record Data API exposure settings from the Supabase dashboard or MCP project
metadata.

Also verify grants:

```sql
select routine_schema, routine_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and grantee in ('anon', 'authenticated', 'PUBLIC')
order by routine_name, grantee;
```

Expected:

- No application RPC exposure.
- `rls_auto_enable()` is not executable by `public`, `anon`, or
  `authenticated`.

## Rollback And Failure Plan

If any pre-check fails:

- Stop before applying migrations.
- Record the failed check and evidence.
- Do not attempt dashboard repairs without a reviewed corrective plan.

If any migration fails:

- Stop immediately.
- Do not continue to the next migration.
- Capture:
  - migration file,
  - failing statement,
  - exact error,
  - timestamp,
  - whether the transaction rolled back,
  - current schema state.
- Open a failure/results PR.
- Prefer a forward corrective migration if the database remains consistent.
- Restore from backup/snapshot only if the database is inconsistent and a
  forward correction is unsafe.

If any verification query fails:

- Stop immediately.
- Capture the query and output.
- Do not proceed to later migrations.
- Document whether the issue is a migration defect, environment mismatch, or
  verification-query mismatch.

## Final Approval Checklist

Execution may begin only when all are true:

- PR #9 is merged.
- This Phase 1E plan is merged.
- Supabase target is confirmed as `strideo-dev`.
- Supabase project ref is confirmed as `ntxtakbggtljjbalgris`.
- Automatic new-table exposure is confirmed off.
- No Strideo application tables exist.
- No secrets are committed.
- Backup/restore path is available.
- `pgcrypto` and `btree_gin` readiness is confirmed or verified at `0002`.
- The user explicitly authorizes migration execution.

## Expected Post-Execution Deliverables

After successful execution, open a results PR with:

- migration execution log,
- verification query output,
- Supabase advisor output,
- schema snapshot,
- generated Supabase type definitions,
- any deviations or warnings,
- confirmation that no real data was seeded,
- confirmation that no application code was written,
- confirmation that no browser grants were added.

## Decision

Ready for final review before Supabase Dev migration execution.

Do not apply migrations until explicit execution approval is given.
