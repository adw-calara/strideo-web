# Phase 2D Dev Bootstrap Runtime Verification

## Summary

Phase 2D reran Dev runtime verification for the revised server-only
service-role profile bootstrap path after local runtime secrets were configured.

- Dev project: `strideo-dev`
- Dev project ref: `ntxtakbggtljjbalgris`
- Production touched: no
- Migrations created: no
- Migrations applied: no
- Existing migration files modified: no

Runtime verification found a real blocker: the local app can authenticate a
Dev test user, but the current server-side bootstrap helper cannot create
`public.profiles` or `public.profile_roles` rows because Supabase REST table
access returns `403` for the service-role client on `public.profiles`.

## Environment Presence Check

Values were not printed.

- `NEXT_PUBLIC_SUPABASE_URL`: present
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: present
- `SUPABASE_SERVICE_ROLE_KEY`: present

`.env.local` remains ignored by git and was not committed.

## Dev Project And Migration Status

Supabase Dev MCP access was available.

- Target project confirmed: `strideo-dev`
- Target project ref confirmed: `ntxtakbggtljjbalgris`
- Migration history includes `0015_profile_bootstrap`
- Existing Dev auth user count before runtime test: `0`

No Dev user emails or IDs were printed.

## Test Method

Runtime verification used the supported Supabase Auth Admin API to create a
temporary Dev-only auth user. The app was then exercised through the local Next
dev server and browser automation:

1. Create temporary Dev auth user with Auth Admin API.
2. Start local app runtime with `.env.local`.
3. Sign in through the app login form.
4. Load the protected dashboard route.
5. Check whether runtime bootstrap created profile and baseline role rows.
6. Clean up the temporary auth user and any associated rows.

Direct SQL insertion into `auth.users` was not attempted.

## Bootstrap Verification Result

Live app runtime bootstrap verification: failed.

Observed result:

- Temporary Dev auth user creation through Auth Admin API: passed
- App login flow: passed
- Protected route load: passed
- `public.profiles` row created for test user: no
- baseline `public.profile_roles` row with role `user` created for test user:
  no

The runtime blocker is service-role REST table access:

- Direct REST check against `public.profiles` with the service-role key returned
  status `403`.
- Supabase JS `.from("profiles")` and `.from("profile_roles")` service-role
  table access failed.
- Database grant inspection showed `service_role` currently has only
  `REFERENCES`, `TRIGGER`, and `TRUNCATE` privileges on `public.profiles` and
  `public.profile_roles`, not the table privileges needed by the current
  `.from(...).upsert(...)` bootstrap helper.

No browser role-write policies were added, and RLS was not broadened during
this test.

## Missing-Role Retry Result

Live missing-role retry verification: blocked.

Reason: initial runtime bootstrap did not create the baseline `user` role, so
there was no successfully bootstrapped state from which to remove and recreate
the role through the protected profile context.

The committed app logic still retries bootstrap when either:

- the current user's `public.profiles` row is missing, or
- the current user's baseline `public.profile_roles` row with role `user` is
  missing.

That retry path still requires a server-side write path that can access
`public.profiles` and `public.profile_roles`.

## Role Assignment Verification

Database-side Dev verification after cleanup showed:

- Auth users: `0`
- Profiles: `0`
- Baseline `user` roles: `0`
- Elevated `operator` or `admin` roles: `0`

No `operator` or `admin` roles were created.

## RLS, Policy, And Grant Verification

Database-side Dev verification showed:

- `profile_roles` browser write policy count: `0`
- Public tables checked for RLS: `76`
- Public tables with RLS enabled: `76`
- Public tables with RLS disabled: none
- Public table grants to `anon` or `authenticated`: none

No RLS policies were broadened.
No browser role-write policies were added.
No public browser grants were added.

Service-role grants on `public.profiles` and `public.profile_roles` were also
inspected. The current grants do not include the table privileges needed by the
runtime `.from(...).upsert(...)` helper.

## Cleanup Result

Temporary Dev auth user cleanup: passed.

Cleanup used the supported Auth Admin API and explicit cleanup attempts for
associated `public.profiles` and `public.profile_roles` rows. Final Dev counts
returned to zero auth users, zero profiles, and zero profile roles.

## Local Verification

Commands run:

```bash
npm run lint
npm run build
git diff --check
```

Results:

- `npm run lint`: passed
- `npm run build`: passed
- `git diff --check`: passed

## Remaining Follow-Ups

- Create a follow-up plan or migration for the server-owned bootstrap write
  path.
- Options to evaluate:
  - grant the needed `service_role` table privileges on `public.profiles` and
    `public.profile_roles`, or
  - move bootstrap writes behind a reviewed SQL function/RPC or other
    server-owned path that does not broaden browser access.
- Re-run Phase 2D runtime verification after the server-owned write path is
  fixed.
- Verify the missing-role retry path by removing only the baseline `user` role
  for the test user, reloading protected context, and confirming role
  recreation.
- Production remains untouched and must not be used for this verification.
