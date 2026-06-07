# Phase 2C Profile Bootstrap Plan

## Summary

Phase 2C plans the safest way to create an app profile and baseline user role for a newly authenticated Strideo user without weakening RLS.

Recommended approach: create an append-only migration with a private database function and trigger on `auth.users` insert.

No migration is created in this planning phase.

## Current Blocker

Phase 2B can load profile and role context, but it cannot create missing profile rows.

Current blocker:

- `public.profiles` exists and is the canonical app profile table.
- `public.profile_roles` exists and is the canonical trusted role table.
- `profiles` has owner-scoped `select` policy only.
- `profile_roles` has owner-scoped `select` policy only.
- There are no `insert` or `update` policies for `profiles`.
- There are no write policies for `profile_roles`.
- Phase 1 security hardening intentionally removed broad default grants to `anon` and `authenticated`.
- Existing migrations intentionally defer browser-facing grants until RLS and entitlement tests are approved.

The app therefore must not use a browser/session-driven insert to create a profile yet.

## Existing Schema Findings

### Profile Table

Canonical table:

```text
public.profiles
```

Created by:

```text
supabase/migrations/0007_user_and_entitlement_tables.sql
```

Important columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null unique references auth.users (id) on delete cascade`
- `display_name text`
- `email text`
- `status public.profile_status not null default 'active'`
- `default_plan public.subscription_plan not null default 'free'`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

The table comment says authorization must rely on trusted identity, entitlements, and roles, not user-editable fields.

### Role Table

Canonical table:

```text
public.profile_roles
```

Created by:

```text
supabase/migrations/0007_user_and_entitlement_tables.sql
```

Important columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users (id) on delete cascade`
- `role public.profile_role not null`
- `created_by_user_id uuid references auth.users (id)`
- `created_at timestamptz not null default now()`
- `unique (user_id, role)`

The table comment says trusted operator/admin role assignments are server-only and must not rely on user-editable metadata.

### Enums And Types

Created by:

```text
supabase/migrations/0002_extensions_and_types.sql
```

Relevant enums:

- `public.profile_status`: `active`, `disabled`, `deleted`
- `public.profile_role`: `user`, `operator`, `admin`
- `public.subscription_plan`: `free`, `pro`, `elite`

### RLS Policies

Created by `0010_rls_policies.sql`, optimized by `0014_rls_initplan_optimization.sql`.

Current relevant policies:

- `profiles_select_own` on `public.profiles`
- `profile_roles_select_own` on `public.profile_roles`

Both policies are read-only and owner-scoped.

There are no profile or role write policies.

### Triggers And Functions

Local migration review found no current profile bootstrap trigger or function on `auth.users`.

`0001_security_hardening.sql` references an existing `public.rls_auto_enable()` security definer helper, but that function is unrelated to profile creation and has execute revoked from public browser roles.

## Bootstrap Options Compared

### Option A: Database Trigger On `auth.users` Insert

Description:

- Add a private schema function such as `private.bootstrap_new_user_profile()`.
- Attach it to `auth.users` with an `after insert` trigger.
- Insert a baseline row into `public.profiles`.
- Insert a baseline `user` role into `public.profile_roles`.
- Use `on conflict do nothing` for idempotency.

Security:

- Best fit for least privilege if the function is private, narrowly scoped, and not executable by `anon` or `authenticated`.
- Keeps profile and baseline role creation inside the database, tied to trusted `auth.users`.
- Avoids service-role secrets in app runtime paths.
- Does not require broad browser write grants.
- Must not assign `operator` or `admin` from user metadata.

Maintainability:

- Reliable and automatic for every new auth user.
- Works regardless of whether signup happens through the web app, admin-created user, or Supabase Auth UI/API.
- Requires careful migration review because it touches `auth.users`.

RLS impact:

- Does not require relaxing browser RLS write policies.
- Existing owner-scoped read policies remain valid.
- The trigger writes as a privileged database function, so the function body must be minimal and auditable.

### Option B: Server-Side Route Or Action Using Service Role

Description:

- Add a server route or action that uses `SUPABASE_SERVICE_ROLE_KEY` to upsert `profiles` and baseline `profile_roles`.
- Call the route after login or during protected layout/profile loading.

Security:

- Keeps browser clients from writing roles directly.
- Introduces service-role handling into the app runtime, which increases blast radius if misused.
- Requires careful environment isolation so the key never reaches browser code.
- Must avoid using user-editable metadata for role assignment.

Maintainability:

- Easier to iterate in app code than a database trigger.
- Coupled to app login/profile loading paths; users created outside the app may not bootstrap until they visit the app.
- Requires robust idempotency and error handling in application code.

RLS impact:

- Does not require broadening RLS if the service role performs the write.
- Bypasses RLS by design, so tests and code review must be strict.

### Option C: User-Side Insert Policy

Description:

- Grant authenticated users insert access to `profiles`.
- Add `profiles_insert_own` with `with check (user_id = (select auth.uid()))`.
- Optionally let users update safe fields such as `display_name`.

Security:

- Acceptable only for tightly scoped user-editable profile fields.
- Does not safely cover `profile_roles`, because users must not assign roles to themselves.
- Requires explicit grants and policies, increasing the browser-facing surface area.
- Easy to accidentally include fields that should remain trusted/server-owned.

Maintainability:

- Simple for client-side profile creation.
- Requires careful field-level conventions because Postgres RLS policies do not directly restrict individual columns.

RLS impact:

- Broadens browser write surface for `profiles`.
- Still needs a separate server/database path for baseline role creation.
- Not ideal as the primary bootstrap strategy.

## Recommended Approach

Use Option A: database trigger on `auth.users` insert.

This best matches Strideo's current security posture:

- `profile_roles` is documented as trusted/server-only.
- Phase 1 intentionally avoided broad browser grants.
- Phase 2B already treats profile bootstrap as a missing trusted backend path.
- A trigger can create exactly the baseline `profiles` row and baseline `user` role without letting the browser write trusted data.

The trigger should create only:

- `profiles.user_id`
- `profiles.email`
- optional `profiles.display_name` from trusted or cautiously treated auth fields
- default `profiles.status = active`
- default `profiles.default_plan = free`
- `profile_roles.role = user`

It must not create `operator` or `admin` roles.

Operator/admin assignment should remain a separate admin-only process, likely via a future reviewed server-only path.

## Proposed Migration

Future append-only migration filename:

```text
supabase/migrations/0015_profile_bootstrap.sql
```

Proposed outline:

1. Create or replace private function:

```sql
create or replace function private.bootstrap_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), '')
  )
  on conflict (user_id) do nothing;

  insert into public.profile_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;
```

2. Revoke function execution from public browser roles:

```sql
revoke execute on function private.bootstrap_new_user_profile() from public;
revoke execute on function private.bootstrap_new_user_profile() from anon;
revoke execute on function private.bootstrap_new_user_profile() from authenticated;
```

3. Drop and recreate a same-name auth trigger idempotently:

```sql
drop trigger if exists on_auth_user_created_bootstrap_profile on auth.users;

create trigger on_auth_user_created_bootstrap_profile
  after insert on auth.users
  for each row execute function private.bootstrap_new_user_profile();
```

4. Backfill existing auth users in Dev with baseline profile and `user` role.

Backfill must be reviewed carefully and should use idempotent inserts:

```sql
insert into public.profiles (user_id, email)
select id, email
from auth.users
on conflict (user_id) do nothing;

insert into public.profile_roles (user_id, role)
select id, 'user'::public.profile_role
from auth.users
on conflict (user_id, role) do nothing;
```

5. Do not add browser write policies for `profile_roles`.

6. Consider a separate future migration for user-editable `profiles.display_name` updates only after field-level expectations and tests are defined.

## Required App-Code Changes

After the future migration is created and applied to Dev:

- Keep Phase 2B read-only profile loading.
- Remove or soften the "bootstrap blocked" dashboard copy once profile rows are automatically created.
- Add a profile refresh path after login if needed.
- Add a settings form for `display_name` only if a future `profiles_update_own` policy is approved.
- Do not add browser role mutation.
- Keep admin/operator UI gated by trusted `profile_roles` reads.

## RLS And Security Impact

Recommended trigger approach:

- Does not require broad authenticated insert/update grants.
- Does not weaken current owner-scoped read policies.
- Keeps role assignment out of browser clients.
- Avoids introducing service-role credentials into application code.
- Uses trusted `auth.users.id` as the source for `profiles.user_id`.
- Treats auth metadata only as optional display data, never authorization data.

Risk areas to review before execution:

- The function is `security definer`; its search path and privileges must be explicit.
- The function must live in `private`, not an exposed schema intended for Data API RPC.
- Execute privileges must be revoked from public browser roles.
- The trigger must be idempotent.
- Backfill should be Dev-tested before production authorization.

## Dev Verification Checklist

Before applying the future migration:

1. Confirm target project is Supabase Dev `strideo-dev` / `ntxtakbggtljjbalgris`.
2. Confirm migrations `0001` through `0014` are applied.
3. Confirm `0015_profile_bootstrap` is pending.
4. Inspect generated SQL and verify it is append-only.
5. Confirm no production credentials or project refs are used.

After applying to Dev:

1. Confirm migration history shows `0015_profile_bootstrap`.
2. Create or identify a Dev auth user.
3. Confirm `public.profiles` contains exactly one row for that user.
4. Confirm `public.profile_roles` contains baseline `user` role for that user.
5. Confirm no `operator` or `admin` roles are auto-assigned.
6. Confirm a signed-in user can read their own profile and roles.
7. Confirm a signed-in user cannot read another user's profile or roles.
8. Confirm browser clients cannot insert or update `profile_roles`.
9. Confirm function execute is not granted to `anon` or `authenticated`.
10. Run relevant Supabase security/performance advisors if available.
11. Run `npm run lint`, `npm run build`, and `git diff --check` after any app copy changes.

## Production Safety Notes

- Production remains untouched in Phase 2C planning.
- Do not apply `0015_profile_bootstrap.sql` to production until Dev execution is verified and separately authorized.
- Production rollout should include a backfill count and duplicate check before execution.
- Operator/admin role assignment must remain a separate reviewed process.
- Do not use user-editable metadata for authorization decisions.
- Do not expose service-role credentials to browser or client-side code.
