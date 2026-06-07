# Phase 2C Profile Bootstrap Migration Preview

## Summary

This preview describes the append-only migration:

```text
supabase/migrations/0015_profile_bootstrap.sql
```

The migration is prepared but not applied.

## What The Trigger Does

The migration creates `private.bootstrap_new_user_profile()` and attaches it to `auth.users` with an `after insert` trigger named:

```text
on_auth_user_created_bootstrap_profile
```

When Supabase Auth creates a new user, the trigger:

1. Inserts one baseline row into `public.profiles`.
2. Inserts one baseline role row into `public.profile_roles`.
3. Uses `on conflict do nothing` so repeated execution cannot create duplicates.

The migration also includes an idempotent backfill for existing `auth.users` rows so existing Dev users get the same baseline profile and `user` role when the migration is applied.

## Tables Written

The migration writes only:

- `public.profiles`
- `public.profile_roles`

It does not alter unrelated tables, indexes, grants, policies, schemas, or data.

## Role Assigned

The migration assigns only:

```text
user
```

It does not assign:

- `operator`
- `admin`

Operator/admin assignment remains a separate server-owned process that must be designed and reviewed independently.

## Security Model

The bootstrap function is created in the `private` schema and marked `security definer` so it can perform trusted bootstrap writes without adding browser insert policies.

Security controls:

- Function search path is set explicitly.
- Function execution is revoked from `public`, `anon`, and `authenticated`.
- Auth metadata is used only as optional display data.
- Auth metadata is not used for authorization or role assignment.
- Inserts are conflict-safe and idempotent.
- The trigger uses trusted `auth.users.id` as `profiles.user_id` and `profile_roles.user_id`.

## Why Browser Clients Still Cannot Write Roles

The migration does not add any `insert`, `update`, or `delete` policy for `public.profile_roles`.

The migration does not add broad browser grants.

Existing role RLS remains read-only and owner-scoped:

- `profile_roles_select_own`

That means browser clients can continue to read their own trusted role rows when table access is available, but they are not given a path to assign or mutate roles.

## Dev Verification Checklist

Before applying to Dev:

1. Confirm target project is `strideo-dev`.
2. Confirm project ref is `ntxtakbggtljjbalgris`.
3. Confirm migrations `0001` through `0014` are already applied.
4. Confirm `0015_profile_bootstrap` is pending.
5. Confirm production credentials and refs are not used.
6. Review the migration SQL and confirm it is append-only.

After applying to Dev:

1. Confirm migration history includes `0015_profile_bootstrap`.
2. Confirm function exists in `private`.
3. Confirm trigger exists on `auth.users`.
4. Confirm function execute is not granted to `public`, `anon`, or `authenticated`.
5. Confirm every existing auth user has one `public.profiles` row.
6. Confirm every existing auth user has one baseline `user` role.
7. Create a new Dev auth user and confirm profile and `user` role are created automatically.
8. Confirm no `operator` or `admin` role is auto-assigned.
9. Confirm a signed-in user can read their own profile/role through existing app loading.
10. Confirm browser clients still cannot insert/update/delete `profile_roles`.
11. Run Supabase advisors if available.
12. Run `npm run lint`, `npm run build`, and `git diff --check` after any related app copy changes.

## Rollback And Mitigation Notes

If Dev execution fails before commit, stop on the first error and do not retry blindly.

If the trigger causes an issue after Dev execution, the mitigation migration should be append-only and may:

- Drop `on_auth_user_created_bootstrap_profile` from `auth.users`.
- Drop or replace `private.bootstrap_new_user_profile()`.
- Leave already-created baseline `profiles` rows in place unless a separately reviewed data cleanup is approved.
- Leave baseline `user` roles in place unless a separately reviewed data cleanup is approved.

Do not edit or remove `0015_profile_bootstrap.sql` after it is merged or applied.

## Safety

- Supabase touched: no
- Migration created: yes
- Migration applied: no
- Existing migration files modified: no
- RLS broadened: no
- Production touched: no
- Secrets included: no
