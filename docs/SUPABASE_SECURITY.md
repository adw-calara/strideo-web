# Supabase Security Hardening

This project uses Supabase as the system of record for Strideo authentication,
content, assignments, reflection artifacts, and future AI-generated guidance.
The development project is hardened before application tables are introduced so
data exposure is opt-in rather than accidental.

## Default Public Grants

Older Supabase projects may automatically grant broad access on new `public`
tables, sequences, and functions to `anon`, `authenticated`, and `service_role`.
Supabase now recommends disabling those automatic grants so new tables are not
reachable through the Data API until a migration grants access intentionally.

Strideo removes automatic future grants for `anon` and `authenticated` on:

- public tables
- public sequences
- public functions

`service_role` access remains intact for server-only administrative workflows.
Default privileges are owned by the role that creates future objects. If legacy
`supabase_admin` default privileges exist, they must be removed by a session that
is a member of `supabase_admin` or by disabling automatic exposure in the
Supabase Dashboard. A normal `postgres` migration session can harden `postgres`
defaults, but cannot alter another role's default privileges without membership.

References:

- Supabase securing your API: https://supabase.com/docs/guides/api/securing-your-api
- Supabase default exposure changelog: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically

## Intentional Access Grants

Every application table migration must decide whether the browser-facing roles
need access. If a table should be available through Supabase client libraries or
the REST/Data API, grant only the minimum table, sequence, or function privileges
required by the feature.

Examples:

```sql
grant select on table public.example_table to authenticated;
grant insert on table public.example_table to authenticated;
grant usage, select on sequence public.example_table_id_seq to authenticated;
```

Do not grant broad privileges to `anon` or `authenticated` as a shortcut. Anonymous
access should be reserved for explicitly public product surfaces, and authenticated
access should still be constrained by RLS policies.

## RLS Requirements

All Strideo tables in exposed schemas must have Row Level Security enabled before
any `anon` or `authenticated` grant is added.

Required migration order:

1. Create the table.
2. Enable RLS.
3. Create least-privilege RLS policies.
4. Add intentional grants for the roles that need Data API access.
5. Add policy tests or SQL verification for the access model.

Policy rules must be tied to actual product ownership and authorization concepts,
such as learner, guardian, coach, team admin, or internal operator. Do not use
`auth.uid()` alone when access depends on membership, assignment, organization,
or app-level role data. Authorization metadata must come from trusted server-owned
data or `app_metadata`, not user-editable `user_metadata`.

## RLS Auto-Enable Trigger

The dev project includes an `ensure_rls` event trigger that calls
`public.rls_auto_enable()` after table creation in `public`. This is a defense in
depth control that enables RLS automatically on new public tables.

The trigger function is a privileged `SECURITY DEFINER` function. It must not be
callable by browser-facing roles through RPC, so execution is revoked from
`public`, `anon`, and `authenticated`. Only privileged server/database roles should
execute it.

The event trigger is not a replacement for explicit policies. A table with RLS
enabled and no policy denies browser-facing access, which is the correct default.

## Service Role Handling

The Supabase `service_role` key bypasses RLS and must never be exposed to browser
code, mobile clients, public repositories, logs, analytics tools, or user-controlled
runtime environments.

Rules for Strideo:

- Never prefix service-role values with `NEXT_PUBLIC_`.
- Use publishable/browser-safe keys only in frontend code.
- Use service-role credentials only in trusted server-side code, scheduled jobs,
  secure operations scripts, or Supabase-controlled functions.
- Prefer narrow database policies and grants over service-role usage whenever a
  user-scoped operation can be performed safely through RLS.
- Rotate credentials immediately if a service-role key is suspected to have been
  exposed.

## Verification Queries

Security hardening PRs should include before and after evidence for:

- default privileges in `pg_default_acl`
- `public.rls_auto_enable()` execute permissions
- `ensure_rls` event trigger status
- temporary table verification proving automatic RLS enablement still works

Temporary verification tables must be created inside a transaction that is rolled
back, or dropped before the migration is considered complete. Do not introduce
application tables as part of security hardening.

## Current Dev Project Finding

On June 6, 2026, `strideo-dev` was verified with the Supabase MCP session running
as `postgres`. The session successfully removed broad future grants owned by
`postgres` and revoked browser-facing execute permissions on
`public.rls_auto_enable()`.

The same session could not change `supabase_admin` default privileges because
`postgres` is not a member of `supabase_admin` in this project. If
`supabase_admin` default ACLs still grant `anon` or `authenticated` access, treat
that as a remaining Supabase project-setting blocker before Phase 0 application
table work.
