# Phase 2B Profile Role Bootstrap

## Summary

Phase 2B adds read-only profile and role context to the authenticated Strideo dashboard shell.

The app now resolves the authenticated Supabase user server-side, attempts to load their existing Strideo profile and trusted roles, and renders role-aware placeholders only when those roles are available.

## Existing Schema Used

Canonical profile table:

- `public.profiles`
- Created in `supabase/migrations/0007_user_and_entitlement_tables.sql`
- Key columns used by the app: `user_id`, `display_name`, `email`, `status`, `default_plan`
- Current RLS posture: owner-scoped `select` policy only

Canonical role table:

- `public.profile_roles`
- Created in `supabase/migrations/0007_user_and_entitlement_tables.sql`
- Role enum: `public.profile_role` with `user`, `operator`, `admin`
- Key columns used by the app: `user_id`, `role`
- Current RLS posture: owner-scoped `select` policy only

Related profile/account tables reviewed but not used for bootstrap:

- `public.subscriptions`
- `public.entitlements`

## Behavior Added

- Protected app layout loads authenticated profile context after Supabase Auth claim verification.
- Header displays the best available identity label:
  - profile display name when readable and present
  - authenticated email otherwise
- Dashboard displays:
  - authenticated email
  - display name when available
  - access level derived from trusted role or default plan
  - assigned roles when readable
  - a clear unavailable/missing message when profile rows or table access are not available
- Settings now includes a role-aware access placeholder.
- Admin/internal placeholders are hidden unless `operator` or `admin` is read from `profile_roles`.

## Bootstrap Decision

Profile bootstrap was not implemented in this phase.

The existing schema supports storing profiles, but it does not safely support browser/session-driven profile creation yet:

- `profiles` has an owner-scoped `select` policy.
- `profiles` does not have an `insert` or `update` policy.
- Existing migrations intentionally avoid browser-facing `GRANT` statements until RLS and entitlement tests are approved.
- The app does not use service-role credentials.

Because of that, Phase 2B uses read-only profile loading and documents missing profile rows as a bootstrap blocker.

## Proposed Future Migration

If automatic profile bootstrap is approved later, create an append-only migration such as:

```text
supabase/migrations/0015_profile_bootstrap_policy.sql
```

Recommended contents to design and review before execution:

- Explicit grants required for authenticated profile reads/inserts if not already present.
- A narrow `profiles_insert_own` policy with `with check (user_id = (select auth.uid()))`.
- Optional `profiles_update_own` policy for safe user-editable fields only, such as `display_name`.
- No role writes from browser clients.
- No authorization dependency on user-editable metadata.
- Tests proving a user can create only their own profile and cannot assign roles.

## Safety

- Supabase touched: no
- Production touched: no
- Migrations created: no
- Migrations applied: no
- Existing migration files modified: no
- RLS access broadened: no
- Service-role credentials used: no

## Verification

Run before handoff:

```bash
npm run lint
npm run build
git diff --check
```
