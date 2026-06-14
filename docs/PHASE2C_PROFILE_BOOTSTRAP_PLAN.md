# Phase 2C Profile Bootstrap Plan

## Summary

Phase 2C plans the safest way to create an app profile and baseline user role
for a newly authenticated Strideo user without weakening RLS.

Revised recommended approach: use a server-only service-role bootstrap path that
creates the current user's profile and baseline `user` role without adding
browser write access to role tables.

Revision note: the original trigger-on-`auth.users` approach was prepared in PR
#24 but failed in Supabase Dev with `ERROR: 42501: must be owner of relation
users`. Migration `0015_profile_bootstrap` was not applied, and production was
not touched. The revised approach avoids creating triggers on `auth.users`.

## Current Blocker

Phase 2B can load profile and role context, but it cannot create missing profile
rows through browser/session-scoped table writes.

Current blocker:

- `public.profiles` exists and is the canonical app profile table.
- `public.profile_roles` exists and is the canonical trusted role table.
- `profiles` has owner-scoped `select` policy only.
- `profile_roles` has owner-scoped `select` policy only.
- There are no `insert` or `update` policies for `profiles`.
- There are no write policies for `profile_roles`.
- Phase 1 security hardening intentionally removed broad default grants to
  `anon` and `authenticated`.
- Existing migrations intentionally defer browser-facing grants until RLS and
  entitlement tests are approved.

The app therefore must not use a browser/session-driven insert to create trusted
profile role data.

## Existing Schema Findings

Canonical profile table:

```text
public.profiles
```

Important columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null unique references auth.users (id) on delete cascade`
- `display_name text`
- `email text`
- `status public.profile_status not null default 'active'`
- `default_plan public.subscription_plan not null default 'free'`

Canonical role table:

```text
public.profile_roles
```

Important columns:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users (id) on delete cascade`
- `role public.profile_role not null`
- `created_by_user_id uuid references auth.users (id)`
- `unique (user_id, role)`

Relevant enum:

```text
public.profile_role: user, operator, admin
```

Current relevant policies:

- `profiles_select_own` on `public.profiles`
- `profile_roles_select_own` on `public.profile_roles`

Both policies are read-only and owner-scoped. There are no profile or role write
policies.

## Bootstrap Options Compared

### Option A: Database Trigger On `auth.users` Insert

Description:

- Add a private schema function such as `private.bootstrap_new_user_profile()`.
- Attach it to `auth.users` with an `after insert` trigger.
- Insert a baseline row into `public.profiles`.
- Insert a baseline `user` role into `public.profile_roles`.

Security:

- Keeps profile and baseline role creation inside the database.
- Avoids service-role secrets in app runtime paths.
- Does not require broad browser write grants.

Dev execution finding:

- This approach failed through the available Dev migration path because the
  execution role was not the owner of `auth.users`.
- Do not retry this path unless a Supabase-supported execution path with the
  required ownership is explicitly confirmed and authorized.

### Option B: Server-Side Route Or Helper Using Service Role

Description:

- Add server-only code that uses `SUPABASE_SERVICE_ROLE_KEY` to upsert
  `profiles` and baseline `profile_roles`.
- Call the helper during protected profile loading when a current user's profile
  is missing.

Security:

- Keeps browser clients from writing roles directly.
- Requires strict server-only isolation so the service-role key never reaches
  browser code.
- Must derive the user from the current authenticated server session.
- Must not accept arbitrary `user_id` or role values from clients.
- Must not use user-editable metadata for role assignment.

Maintainability:

- Easier to iterate in app code than an `auth.users` trigger.
- Users created outside the app may not bootstrap until they visit the app.
- Requires idempotency and clear runtime error handling.

RLS impact:

- Does not require broadening RLS if the service role performs the write.
- Bypasses RLS by design, so tests and code review must be strict.

### Option C: User-Side Insert Policy

Description:

- Grant authenticated users insert access to `profiles`.
- Add `profiles_insert_own` with `with check (user_id = (select auth.uid()))`.

Security:

- Does not safely cover `profile_roles`, because users must not assign roles to
  themselves.
- Broadens the browser-facing write surface.
- Still needs a separate server/database path for baseline role creation.

## Recommended Approach

Use Option B: server-side helper using the Supabase service role.

This now best matches Strideo's security posture and Dev execution constraints:

- `profile_roles` is documented as trusted/server-only.
- Phase 1 intentionally avoided broad browser grants.
- Phase 2B already treats profile bootstrap as a missing trusted backend path.
- Dev migration execution cannot create the originally proposed trigger on
  `auth.users`.
- A server-only helper can create exactly the baseline `profiles` row and
  baseline `user` role without letting the browser write trusted data.

The server bootstrap path should create only:

- `profiles.user_id`
- `profiles.email`
- default `profiles.status = active`
- default `profiles.default_plan = free`
- `profile_roles.role = user`

It must not create `operator` or `admin` roles.

## Proposed Migration

Future append-only migration filename:

```text
supabase/migrations/20260607202021_0015_profile_bootstrap.sql
```

Revised outline:

1. Keep `0015_profile_bootstrap.sql` as an append-only no-op marker.
2. Do not create triggers on `auth.users`.
3. Do not create exposed `SECURITY DEFINER` RPC functions.
4. Do not add browser write policies for `profile_roles`.
5. Add server-only app code that:
   - derives the user from the current authenticated server session,
   - uses the service role only in server-only modules,
   - creates `public.profiles` idempotently for the current user,
   - creates `public.profile_roles` idempotently with role `user` only,
   - never accepts arbitrary `user_id` or role values from the browser.
6. Consider a separate future migration for user-editable
   `profiles.display_name` updates only after field-level expectations and
   tests are defined.

## Required App-Code Changes

- Keep Phase 2B owner-scoped profile/role reads.
- Call the server bootstrap helper when the protected profile loader finds a
  missing app profile.
- Re-read profile/role rows after successful bootstrap.
- Keep service-role usage isolated to server-only modules.
- Add a settings form for `display_name` only if a future `profiles_update_own`
  policy is approved.
- Do not add browser role mutation.
- Keep admin/operator UI gated by trusted `profile_roles` reads.

## RLS And Security Impact

Revised server-only approach:

- Does not require broad authenticated insert/update grants.
- Does not weaken current owner-scoped read policies.
- Keeps role assignment out of browser clients.
- Uses service-role credentials only in server-only application modules.
- Uses the current authenticated server session as the source for
  `profiles.user_id`.
- Does not use user-editable metadata for authorization or role assignment.

Risk areas to review before execution:

- The service-role key must never be exposed to browser code.
- The helper must not accept arbitrary user or role input from clients.
- Bootstrap writes must be idempotent.
- Runtime bootstrap behavior should be Dev-tested before production
  authorization.

## Dev Verification Checklist

Before applying the future migration:

1. Confirm target project is Supabase Dev `strideo-dev` / `ntxtakbggtljjbalgris`.
2. Confirm migrations `0001` through `0014` are applied.
3. Confirm `0015_profile_bootstrap` is pending.
4. Inspect generated SQL and verify it is append-only.
5. Confirm no production credentials or project refs are used.

After applying the no-op marker migration to Dev and testing the app path:

1. Confirm migration history shows `0015_profile_bootstrap`.
2. Confirm no Phase 2C trigger exists on `auth.users`.
3. Sign in with a Dev auth user.
4. Confirm `public.profiles` contains exactly one row for that user.
5. Confirm `public.profile_roles` contains baseline `user` role for that user.
6. Confirm no `operator` or `admin` roles are auto-assigned.
7. Confirm a signed-in user can read their own profile and roles.
8. Confirm a signed-in user cannot read another user's profile or roles.
9. Confirm browser clients cannot insert or update `profile_roles`.
10. Run relevant Supabase security/performance advisors if available.
11. Run `npm run lint`, `npm run build`, and `git diff --check` after any app
    code changes.

## Production Safety Notes

- Production remains untouched in Phase 2C planning and revision.
- Do not apply `0015_profile_bootstrap.sql` to production until Dev execution
  and app-path verification are completed and separately authorized.
- Operator/admin role assignment must remain a separate reviewed process.
- Do not use user-editable metadata for authorization decisions.
- Do not expose service-role credentials to browser or client-side code.
