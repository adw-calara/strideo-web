# Phase 2D Dev Bootstrap Runtime Verification

## Summary

Phase 2D attempted Dev runtime verification for the revised server-only
service-role profile bootstrap path.

- Dev project: `strideo-dev`
- Dev project ref: `ntxtakbggtljjbalgris`
- Production touched: no
- Migrations created: no
- Migrations applied: no
- Existing migration files modified: no

Runtime bootstrap verification could not be fully completed in this local
environment because the app runtime does not have `SUPABASE_SERVICE_ROLE_KEY`
available and Dev currently has zero auth users.

## Environment Presence Check

Values were not printed.

- `NEXT_PUBLIC_SUPABASE_URL`: present
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`:
  present
- `SUPABASE_SERVICE_ROLE_KEY`: missing

The missing service-role runtime key prevents the server-only bootstrap helper
from creating `public.profiles` and `public.profile_roles` rows during a local
runtime verification.

## Dev Project And Migration Status

Supabase Dev MCP access was available.

- Target project confirmed: `strideo-dev`
- Target project ref confirmed: `ntxtakbggtljjbalgris`
- Migration history includes `0015_profile_bootstrap`
- Existing Dev auth user count: `0`

No Dev user emails or IDs were printed.

## Test Method

The intended test method was:

1. Use a supported Auth Admin/API flow to create or use a Dev-only test auth
   user.
2. Sign in or simulate an authenticated server session through the app runtime.
3. Load the protected dashboard/profile context.
4. Confirm the server-only bootstrap helper creates or ensures:
   - one `public.profiles` row for the current user
   - one `public.profile_roles` row with role `user`
5. Remove the baseline `user` role and reload protected context to verify the
   missing-role retry path.
6. Clean up the test user and associated rows through a supported cleanup path.

This live runtime path was not executed because:

- Dev has zero existing auth users.
- The local app runtime is missing `SUPABASE_SERVICE_ROLE_KEY`.
- There is no safe Auth Admin tool path available in this environment.
- Direct SQL insertion into `auth.users` was intentionally not attempted because
  it is not a supported Auth Admin flow and would not accurately verify the app
  runtime.

## Bootstrap Verification Result

Live app runtime bootstrap verification: not completed.

Reason: missing service-role runtime configuration plus no Dev auth user to
exercise.

Code-level bootstrap behavior remains in place:

- Bootstrap derives the user from the authenticated server session.
- Bootstrap does not accept arbitrary `user_id` from the browser.
- Bootstrap writes only to `public.profiles` and `public.profile_roles`.
- Bootstrap assigns only baseline role `user`.
- Bootstrap does not assign `operator` or `admin`.
- Bootstrap is server-only and uses the service-role client only in server-only
  modules.

## Missing-Role Retry Result

Live missing-role retry verification: not completed.

Reason: the runtime bootstrap path could not be exercised without a Dev auth
user and service-role runtime configuration.

Committed code behavior:

- If the profile row is missing, protected profile loading attempts bootstrap.
- If the profile row exists but the baseline `user` role is missing, protected
  profile loading also attempts bootstrap.
- If bootstrap fails, the profile context returns an unavailable state rather
  than silently treating incomplete role state as elevated access.

## Role Assignment Verification

Database-side Dev verification showed:

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

## Cleanup Result

No temporary Dev auth user was created.

Cleanup result: not needed.

Reason: creating a temporary auth user was not safe/supported without
service-role runtime configuration or an Auth Admin tool path. Direct
`auth.users` SQL manipulation was not attempted.

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

- Add `SUPABASE_SERVICE_ROLE_KEY` to the local or Dev runtime environment using
  a secure secret store, not the repo.
- Create or use a Dev-only auth user through a supported Auth Admin/API flow.
- Re-run Phase 2D runtime verification against the protected dashboard/profile
  context.
- Verify the missing-role retry path by removing only the baseline `user` role
  for the test user, reloading protected context, and confirming role recreation.
- Clean up the test auth user and associated profile/role rows through a
  supported path.
- Production remains untouched and must not be used for this verification.
