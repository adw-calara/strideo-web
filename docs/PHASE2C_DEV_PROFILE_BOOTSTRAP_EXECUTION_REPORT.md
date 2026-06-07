# Phase 2C Dev Profile Bootstrap Execution Report

## Summary

Phase 2C Dev execution was authorized for Supabase Dev, but migration `0015_profile_bootstrap` did not apply.

- Dev project: `strideo-dev`
- Dev project ref: `ntxtakbggtljjbalgris`
- Migration attempted: `0015_profile_bootstrap`
- Migration file: `supabase/migrations/0015_profile_bootstrap.sql`
- Migration applied: no
- Production touched: no
- Existing migration files modified locally after execution: no

PR #24 has since been revised to replace the failed `auth.users` trigger
approach with a server-only profile bootstrap path. The revised pending `0015`
does not create a trigger, function, grant, policy, table, index, or data
change.

## Pre-Execution Gates

- Supabase Dev MCP access was available.
- Target project identity was confirmed as `strideo-dev` / `ntxtakbggtljjbalgris`.
- Migration history showed migrations `0001` through `0014` applied before execution.
- Migration `0015` was not present in migration history before execution.
- Production project credentials, refs, and targets were not used.
- Existing Dev auth user count before backfill: `0`

No auth user emails or IDs were printed.

## Execution Result

Migration application stopped on the first error.

Error:

```text
Failed to apply database migration: ERROR: 42501: must be owner of relation users
```

The error occurred while attempting to create or replace the trigger on `auth.users`.

No retry or alternate SQL execution was attempted.

## Revised PR #24 Approach

The failed trigger approach is no longer the proposed Phase 2C implementation.

Revised architecture:

- Use a server-only service-role bootstrap helper.
- Derive the user from the current authenticated server session.
- Write only the current user's `public.profiles` row when missing.
- Write only the current user's baseline `public.profile_roles` row with role
  `user`.
- Retry bootstrap when either the profile row is missing or the baseline `user`
  role is missing.
- Report bootstrap write failures as an unavailable profile context instead of
  silently continuing with incomplete trusted role state.
- Do not accept an arbitrary browser-provided `user_id`.
- Do not assign `operator` or `admin`.
- Do not add browser insert/update/delete policies for `profile_roles`.
- Do not broaden RLS or table grants.

The revised pending migration remains append-only relative to `main`, but it is
now a no-op marker because no database change is required for the server-side
bootstrap path.

## Migration History Verification

Post-attempt migration history still shows only migrations `0001` through `0014`.

Migration `0015_profile_bootstrap` is not recorded as applied.

## Function And Trigger Verification

Post-attempt verification confirmed:

- `private.bootstrap_new_user_profile()` exists: no
- `on_auth_user_created_bootstrap_profile` trigger on `auth.users` exists: no

The failed migration did not leave the intended function or trigger behind.

## Backfill Verification

Existing Dev auth user count before backfill: `0`

Post-attempt counts:

- Auth users: `0`
- Profiles: `0`
- Baseline `user` roles: `0`
- Elevated `operator` or `admin` roles: `0`

Because there were no Dev auth users and the migration did not apply, no backfill rows were created.

## Role Assignment Verification

No baseline or elevated roles were created by this attempt.

Verified elevated role count:

- `operator` / `admin`: `0`

## RLS, Policy, And Grant Verification

Post-attempt verification confirmed:

- `profile_roles` policies remain read-only:
  - `profile_roles_select_own`
  - command: `SELECT`
  - role: `authenticated`
- Public tables checked for RLS: `76`
- Public tables with RLS enabled: `76`
- Public tables with RLS disabled: none
- Public table grants to `anon` or `authenticated`: none

Access behavior and RLS posture remain unchanged.

## Test User Trigger Verification

Skipped.

Reason: migration `0015_profile_bootstrap` did not apply, so the trigger does not exist. Creating a temporary auth user would not verify the intended trigger behavior. No direct `auth.users` insertion or cleanup was attempted because that would not be a safe supported Auth Admin flow through the available execution path.

## Local Verification

Commands run:

```bash
npm run lint
git diff --check
git diff --name-status -- supabase/migrations
```

Results:

- `npm run lint`: passed
- `git diff --check`: passed
- Migration file diff after execution: none

## Remaining Warnings And Follow-Ups

- Production remains untouched.
- Migration `0015_profile_bootstrap` remains pending.
- The current MCP migration execution path does not have ownership privileges
  required to create a trigger on `auth.users`.
- PR #24 has been revised to avoid direct `auth.users` trigger creation.
- The revised path should be verified in Dev through app sign-in/profile loading
  after the no-op marker migration is applied.
- Dev app-path verification should include the resilience case where the profile
  exists but the baseline `user` role is missing.
- Do not apply to production until Dev verification is completed and production
  execution is separately authorized.
