# Phase 2C Profile Bootstrap Migration Preview

## Summary

This preview describes the revised Phase 2C bootstrap approach in PR #24.

Pending migration:

```text
supabase/migrations/20260607202021_0015_profile_bootstrap.sql
```

The migration is prepared but not applied. It is now an intentional no-op
marker because the original `auth.users` trigger approach failed in Supabase
Dev before being recorded in migration history.

## Why The Approach Changed

The original migration attempted to create an after-insert trigger on
`auth.users`:

```text
on_auth_user_created_bootstrap_profile
```

Dev execution failed with:

```text
ERROR: 42501: must be owner of relation users
```

Migration `0015_profile_bootstrap` was not applied. Dev migration history
remained at `0001` through `0014`, and production was not touched.

Because the available Dev execution path cannot create triggers on `auth.users`,
Phase 2C now uses a server-side bootstrap path instead of a database trigger.

## Selected Bootstrap Architecture

Selected approach: server-only service-role bootstrap helper.

New server-only helpers:

- `lib/env/server.ts`
- `lib/supabase/admin.ts`
- `lib/auth/profile-bootstrap.ts`

The protected profile loader calls the bootstrap helper when:

1. A current authenticated server session is present.
2. The current user's app profile is missing, or the app profile exists but the
   baseline `user` role is missing.
3. Server bootstrap environment variables are available.

The helper derives the user from the current authenticated server session. It
does not accept an arbitrary `user_id` from the browser or assign caller-selected
roles.

## Tables Written

The server bootstrap path writes only:

- `public.profiles`
- `public.profile_roles`

No migration in this revision writes data. Runtime writes happen only from
server code using the current authenticated session and the service-role client.

## Role Assigned

The server bootstrap path assigns only:

```text
user
```

It does not assign:

- `operator`
- `admin`

Operator/admin assignment remains a separate server-owned process that must be
designed and reviewed independently.

## Security Model

The revised path keeps database access narrow:

- No trigger is created on `auth.users`.
- No browser insert/update/delete policies are added for `profile_roles`.
- No RLS policies are broadened.
- No table grants are broadened.
- The service-role key is used only in server-only modules.
- The service-role key is not exposed through `NEXT_PUBLIC_*` variables.
- The helper bootstraps only the current authenticated user from server session
  claims.
- Inserts are idempotent through conflict-safe upserts.
- Profile and baseline role are both ensured on each bootstrap attempt. A
  profile row that already exists does not prevent retrying a missing baseline
  `user` role.
- If bootstrap cannot write the profile or baseline role, the profile context
  reports an unavailable state instead of silently granting elevated access.

The migration file remains as a no-op marker so Phase 2C migration history can
advance without altering the database after the trigger approach was rejected by
Dev execution permissions.

## Why Browser Clients Still Cannot Write Roles

The revised migration does not add any `insert`, `update`, or `delete` policy for
`public.profile_roles`.

The revised app code does not expose service-role credentials to the browser.

Existing role RLS remains read-only and owner-scoped:

- `profile_roles_select_own`

Browser clients can continue to read their own trusted role rows when table
access is available, but they are not given a path to assign or mutate roles.

## Dev Verification Checklist

Before applying the revised migration to Dev:

1. Confirm target project is `strideo-dev`.
2. Confirm project ref is `ntxtakbggtljjbalgris`.
3. Confirm migrations `0001` through `0014` are already applied.
4. Confirm `0015_profile_bootstrap` is pending.
5. Confirm production credentials and refs are not used.
6. Review the migration SQL and confirm it does not create triggers, grants,
   policies, tables, indexes, or data changes.

After applying the revised migration to Dev:

1. Confirm migration history includes `0015_profile_bootstrap`.
2. Confirm no trigger exists on `auth.users` from Phase 2C.
3. Confirm no `private.bootstrap_new_user_profile()` trigger function exists
   from the previous approach.
4. Sign in through the app with a Dev user.
5. Confirm the server bootstrap path creates or ensures one `public.profiles`
   row for the current user.
6. Confirm the server bootstrap path creates or ensures one baseline `user` role
   for the current user.
7. Confirm no `operator` or `admin` role is auto-assigned.
8. If the profile exists but the baseline `user` role is missing, confirm the
   next protected profile load creates the missing baseline role.
9. Confirm browser clients still cannot insert/update/delete `profile_roles`.
10. Confirm the service-role key is present only in server environment secrets.
11. Run `npm run lint`, `npm run build`, and `git diff --check`.

## Rollback And Mitigation Notes

If Dev execution of the revised migration fails, stop on the first error and do
not retry blindly.

Because the revised migration is a no-op marker, rollback should focus on app
code if runtime bootstrap behavior is incorrect:

- Disable the server bootstrap helper call from the profile loader.
- Preserve existing `profiles` rows unless separately reviewed cleanup is
  approved.
- Preserve baseline `user` roles unless separately reviewed cleanup is approved.
- Do not delete `operator` or `admin` role rows as part of profile bootstrap
  mitigation.

Do not edit or remove `0015_profile_bootstrap.sql` after it is merged or
applied.

## Safety

- Supabase touched: no during revision
- Migration created: yes, revised pending 0015
- Migration applied: no
- Existing migration files modified: only pending unapplied 0015 in this PR
- RLS broadened: no
- Browser role writes added: no
- Production touched: no
- Secrets included: no
