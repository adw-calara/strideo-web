# Phase 2E Service Role Bootstrap Grants Plan

## Summary

Phase 2E plans the narrowest safe database grant change needed for the current
server-only profile bootstrap helper to create a baseline Strideo app profile
and baseline `user` role.

Recommended approach: append-only migration granting table-level
`select`, `insert`, and `update` on `public.profiles` and
`public.profile_roles` to `service_role` only.

No migration is created in this planning phase.

## Current Blocker

Phase 2D verified the local app can:

- create a temporary Dev auth user through the supported Auth Admin API,
- sign in through the app login form,
- load the protected route.

Runtime bootstrap failed because the server-only helper uses:

```text
adminClient.from("profiles").upsert(...)
adminClient.from("profile_roles").upsert(...)
```

The service-role REST table path returned `403` for `public.profiles`, and
grant inspection showed `service_role` does not currently have the table
privileges needed by the `.from(...).upsert(...)` helper on:

- `public.profiles`
- `public.profile_roles`

Production has not been touched.

## Existing Grant Findings

Local migration review found:

- `0001_security_hardening.sql` revokes broad default privileges from `anon`
  and `authenticated`.
- `0001_security_hardening.sql` grants `service_role` execute only on
  `public.rls_auto_enable()`.
- `0007_user_and_entitlement_tables.sql` creates `public.profiles` and
  `public.profile_roles`.
- `0010_rls_policies.sql` enables RLS and creates read-only owner policies:
  - `profiles_select_own`
  - `profile_roles_select_own`
- `0014_rls_initplan_optimization.sql` preserves those read-only owner policies
  while optimizing `auth.uid()` calls.
- There are no browser insert/update/delete policies for `profile_roles`.

Phase 2D Dev verification found current `service_role` grants on
`public.profiles` and `public.profile_roles` include only:

- `REFERENCES`
- `TRIGGER`
- `TRUNCATE`

They do not include `SELECT`, `INSERT`, or `UPDATE`, which are needed by the
current Supabase JS upsert path.

## Server Bootstrap Code Path

Current server-only helper:

```text
lib/auth/profile-bootstrap.ts
```

It derives the user from the authenticated server session and does not accept
arbitrary browser-provided `user_id` or role values.

The helper writes only:

- `public.profiles.user_id`
- `public.profiles.email`
- `public.profile_roles.user_id`
- `public.profile_roles.role = user`

It does not assign `operator` or `admin`.

The service-role key remains server-only:

```text
lib/supabase/admin.ts
lib/env/server.ts
```

## Options Compared

### Option A: Narrow Service-Role Table Grants

Description:

- Grant `service_role` the exact table privileges needed for the existing
  server-only `.from(...).upsert(...)` bootstrap helper.
- Do not grant anything to `anon` or `authenticated`.
- Do not change RLS policies.
- Do not add browser write policies.

Pros:

- Smallest change to the current app architecture.
- Keeps browser clients blocked from role writes.
- Uses the existing server-only Supabase service-role client.
- Easy to verify through the already-built Phase 2D runtime flow.

Cons:

- `service_role` receives write privileges on the full two tables through the
  Data API path.
- Future server code using the same service-role client must remain disciplined
  and scoped.

### Option B: SECURITY DEFINER RPC Function

Description:

- Create a database function to ensure the caller's profile and baseline role.
- Expose only a narrow callable function instead of table-level service-role
  writes.

Pros:

- Database can enforce a smaller write surface.
- Function can be audited for exact inserts.

Cons:

- Prior Phase 2C already pivoted away from privileged database function/trigger
  complexity.
- Exposed RPC design needs careful schema placement, execute grants, search path
  review, and app changes.
- A callable function that relies on current user context is easier to get wrong
  than the current server-only helper.
- More moving parts than needed for the current blocker.

## Recommended Approach

Use Option A: narrow table grants to `service_role`.

This is the safer path for this repo right now because:

- The app already has a server-only helper that derives identity from the
  authenticated server session.
- The service-role key is not exposed to browser code.
- Browser clients still receive no write policies or grants.
- The grant change is explicit, auditable, and limited to the two bootstrap
  tables.
- It avoids adding a new RPC/function security model before the MVP needs it.

## Proposed Future Migration

Future append-only migration filename:

```text
supabase/migrations/0016_service_role_bootstrap_grants.sql
```

Exact proposed grants:

```sql
grant select, insert, update on table public.profiles to service_role;
grant select, insert, update on table public.profile_roles to service_role;
```

No grants should be added to:

- `anon`
- `authenticated`
- `public`

No RLS policies should be changed.

No browser role-write policies should be added.

## Why These Grants Are Minimal

The current helper uses conflict-safe upserts:

- `profiles` upsert on `user_id`
- `profile_roles` upsert on `(user_id, role)`

PostgREST/Supabase upsert requires table access sufficient to read existing
conflicts and insert or update rows. The proposed grants therefore include:

- `SELECT`
- `INSERT`
- `UPDATE`

`DELETE` is not proposed because runtime bootstrap does not delete profiles or
roles.

`TRUNCATE`, `REFERENCES`, and `TRIGGER` are not part of the bootstrap need and
are not newly proposed here.

## Why Browser Access Remains Blocked

Browser clients use the publishable key and authenticated user session, not the
service-role key.

The proposed migration grants only to:

```text
service_role
```

It does not grant table privileges to:

```text
anon
authenticated
public
```

It does not add any `insert`, `update`, or `delete` RLS policy for
`public.profile_roles`.

Therefore browser clients still cannot assign or mutate roles.

## Why RLS Posture Remains Acceptable

RLS remains enabled on both tables.

Existing owner-scoped read policies remain unchanged:

- `profiles_select_own`
- `profile_roles_select_own`

The Supabase `service_role` key is a server-only administrative credential and
is expected to bypass RLS for trusted server workflows. The risk is controlled
by keeping the key out of browser code and keeping application usage scoped to
the current authenticated server session.

This plan does not weaken RLS for browser roles.

## Dev Verification Checklist

Before creating the future migration:

1. Confirm branch is based on latest `main`.
2. Confirm production is not targeted.
3. Confirm `0015_profile_bootstrap` is already applied in Dev.
4. Review the generated SQL and confirm it contains only the two service-role
   grants.
5. Confirm no grants to `anon`, `authenticated`, or `public`.
6. Confirm no RLS policy changes.

After applying the future migration to Dev:

1. Confirm migration history includes `0016_service_role_bootstrap_grants`.
2. Confirm `service_role` has `SELECT`, `INSERT`, and `UPDATE` on
   `public.profiles`.
3. Confirm `service_role` has `SELECT`, `INSERT`, and `UPDATE` on
   `public.profile_roles`.
4. Confirm `anon` and `authenticated` did not receive table grants.
5. Confirm `profile_roles` still has no browser insert/update/delete policies.
6. Confirm all public tables still have RLS enabled.
7. Create a temporary Dev auth user through the supported Auth Admin API.
8. Sign in through the app and load the protected dashboard.
9. Confirm exactly one `public.profiles` row exists for the test user.
10. Confirm exactly one `public.profile_roles` row exists for the test user with
    role `user`.
11. Confirm no `operator` or `admin` roles were created.
12. Delete only the baseline `user` role row for the test user.
13. Reload protected profile context and confirm the missing role is recreated
    as `user`.
14. Clean up the temporary Dev auth user and associated rows through supported
    paths.
15. Run `npm run lint`, `npm run build`, and `git diff --check`.

## Production Safety Notes

- Production remains untouched.
- Do not apply `0016_service_role_bootstrap_grants.sql` to production until Dev
  execution and runtime verification pass and production execution is separately
  authorized.
- Production rollout should verify current grants before applying.
- Do not add browser write grants as part of production rollout.
- Do not use user-editable metadata for authorization or role assignment.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only in all environments.
