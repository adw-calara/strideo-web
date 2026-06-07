# Phase 1H-A RLS Initplan Analysis

Status: ANALYSIS ONLY - NO RLS CHANGES MADE

Date: June 7, 2026

## Purpose

Phase 1H-A analyzes remaining Supabase performance advisor `auth_rls_initplan` warnings after:

- Phase 1F applied migrations `0001` through `0012` to Supabase Dev.
- Phase 1G applied migration `0013_fk_index_hardening` to Supabase Dev.
- Phase 1G verified all `72` FK indexes from `0013`.

This document does not create a migration and does not modify RLS policies.

Production remains untouched.

## Sources Reviewed

- `AGENTS.md`
- `docs/PHASE1H_DB_ADVISOR_CLEANUP_PLAN.md`
- `docs/PHASE1F_DEV_MIGRATION_EXECUTION_REPORT.md`
- `docs/PHASE1G_DEV_MIGRATION_EXECUTION_REPORT.md`
- `supabase/migrations/0010_rls_policies.sql`

No Supabase inspection was performed for this analysis. The findings are based on the documented Phase 1G advisor category and local RLS policy definitions.

## Advisor Category

Supabase performance advisors reported `auth_rls_initplan` warnings after Phase 1G.

The warning applies when an RLS policy calls `auth.uid()` directly in a row predicate. PostgreSQL may re-evaluate that function per row. Supabase recommends wrapping the auth function call in a scalar subquery so it can be initialized once per statement:

```sql
(select auth.uid())
```

The intended future optimization is semantic-preserving:

```sql
user_id = auth.uid()
```

becomes:

```sql
user_id = (select auth.uid())
```

## Future Migration Filename

If fixes are authorized, use this append-only migration filename:

```text
supabase/migrations/0014_rls_initplan_optimization.sql
```

## Policy Findings

| Table | Policy | Command | Data protected | Current pattern | Recommended optimized pattern | Risk | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `profiles` | `profiles_select_own` | `select` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `subscriptions` | `subscriptions_select_own` | `select` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `entitlements` | `entitlements_select_own` | `select` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `profile_roles` | `profile_roles_select_own` | `select` | Admin/internal data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Medium | Fix in 1H-B with extra review |
| `user_devices` | `user_devices_select_own` | `select` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `user_devices` | `user_devices_insert_own` | `insert` | User data | `with check (user_id = auth.uid())` | `with check (user_id = (select auth.uid()))` | Low | Fix in 1H-B |
| `user_devices` | `user_devices_update_own` | `update` | User data | `using` and `with check` call `auth.uid()` | Wrap both calls with `(select auth.uid())` | Low | Fix in 1H-B |
| `user_devices` | `user_devices_delete_own` | `delete` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `watchlist_items` | `watchlist_items_select_own` | `select` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `watchlist_items` | `watchlist_items_insert_own` | `insert` | User data | `with check (user_id = auth.uid())` | `with check (user_id = (select auth.uid()))` | Low | Fix in 1H-B |
| `watchlist_items` | `watchlist_items_update_own` | `update` | User data | `using` and `with check` call `auth.uid()` | Wrap both calls with `(select auth.uid())` | Low | Fix in 1H-B |
| `watchlist_items` | `watchlist_items_delete_own` | `delete` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `daily_bet_sheets` | `daily_bet_sheets_select_own` | `select` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `daily_bet_sheets` | `daily_bet_sheets_insert_own` | `insert` | User data | `with check (user_id = auth.uid())` | `with check (user_id = (select auth.uid()))` | Low | Fix in 1H-B |
| `daily_bet_sheets` | `daily_bet_sheets_update_own` | `update` | User data | `using` and `with check` call `auth.uid()` | Wrap both calls with `(select auth.uid())` | Low | Fix in 1H-B |
| `daily_bet_sheets` | `daily_bet_sheets_delete_own` | `delete` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `daily_bet_sheet_entries` | `daily_bet_sheet_entries_select_own` | `select` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `daily_bet_sheet_entries` | `daily_bet_sheet_entries_insert_own` | `insert` | User data | `with check (user_id = auth.uid())` | `with check (user_id = (select auth.uid()))` | Low | Fix in 1H-B |
| `daily_bet_sheet_entries` | `daily_bet_sheet_entries_update_own` | `update` | User data | `using` and `with check` call `auth.uid()` | Wrap both calls with `(select auth.uid())` | Low | Fix in 1H-B |
| `daily_bet_sheet_entries` | `daily_bet_sheet_entries_delete_own` | `delete` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `daily_bet_sheet_events` | `daily_bet_sheet_events_select_own` | `select` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `daily_bet_sheet_events` | `daily_bet_sheet_events_insert_own` | `insert` | User data | `with check (user_id = auth.uid())` | `with check (user_id = (select auth.uid()))` | Low | Fix in 1H-B |
| `user_recorded_wagers` | `user_recorded_wagers_select_own` | `select` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `user_recorded_wagers` | `user_recorded_wagers_insert_own` | `insert` | User data | `with check (user_id = auth.uid())` | `with check (user_id = (select auth.uid()))` | Low | Fix in 1H-B |
| `user_recorded_wagers` | `user_recorded_wagers_update_own` | `update` | User data | `using` and `with check` call `auth.uid()` | Wrap both calls with `(select auth.uid())` | Low | Fix in 1H-B |
| `user_recorded_wagers` | `user_recorded_wagers_delete_own` | `delete` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `alert_preferences` | `alert_preferences_select_own` | `select` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `alert_preferences` | `alert_preferences_insert_own` | `insert` | User data | `with check (user_id = auth.uid())` | `with check (user_id = (select auth.uid()))` | Low | Fix in 1H-B |
| `alert_preferences` | `alert_preferences_update_own` | `update` | User data | `using` and `with check` call `auth.uid()` | Wrap both calls with `(select auth.uid())` | Low | Fix in 1H-B |
| `alert_preferences` | `alert_preferences_delete_own` | `delete` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `user_wager_results` | `user_wager_results_select_own` | `select` | User data | `user_id = auth.uid()` | `user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `user_wager_results` | `user_wager_results_insert_own` | `insert` | User data | `with check (user_id = auth.uid())` | `with check (user_id = (select auth.uid()))` | Low | Fix in 1H-B |
| `user_wager_results` | `user_wager_results_update_own` | `update` | User data | `using` and `with check` call `auth.uid()` | Wrap both calls with `(select auth.uid())` | Low | Fix in 1H-B |
| `strategies` | `strategies_select_owner` | `select` | User-owned strategy data | `owner_user_id = auth.uid()` | `owner_user_id = (select auth.uid())` | Low | Fix in 1H-B |
| `strategy_versions` | `strategy_versions_select_owner` | `select` | User-owned strategy data | Nested `exists` with `s.owner_user_id = auth.uid()` | Keep `exists`; change predicate to `s.owner_user_id = (select auth.uid())` | Medium | Fix in 1H-B with extra review |

## Summary Of Warnings Found Or Inferred

- Local RLS policy review found `35` policies using direct `auth.uid()`.
- `33` policies are straightforward owner checks on `user_id` or `owner_user_id`.
- `1` policy, `strategy_versions_select_owner`, uses a nested `exists` query and should be reviewed carefully during migration drafting.
- `1` policy, `profile_roles_select_own`, protects trusted role assignment data and should receive extra review even though the expression change is mechanically simple.

## Why The Advisor Flags These Policies

The direct call pattern can cause `auth.uid()` to be evaluated for each row in the policy predicate. Wrapping it with `(select auth.uid())` allows PostgreSQL to treat the value as an initplan for the statement, reducing repeated function evaluation while preserving the same authenticated user identity.

## Current Policy Pattern Groups

### Select/Delete Owner Policies

Current pattern:

```sql
using (user_id = auth.uid())
```

Recommended pattern:

```sql
using (user_id = (select auth.uid()))
```

### Insert Owner Policies

Current pattern:

```sql
with check (user_id = auth.uid())
```

Recommended pattern:

```sql
with check (user_id = (select auth.uid()))
```

### Update Owner Policies

Current pattern:

```sql
using (user_id = auth.uid())
with check (user_id = auth.uid())
```

Recommended pattern:

```sql
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()))
```

### Strategy Owner Policies

Current pattern:

```sql
owner_user_id = auth.uid()
```

Recommended pattern:

```sql
owner_user_id = (select auth.uid())
```

For `strategy_versions_select_owner`, preserve the nested `exists` query and change only the direct auth call.

## Recommended Disposition

Fix now in the next authorized migration:

- User-owned workflow tables: profiles, devices, watchlists, bet sheets, recorded wagers, alert preferences, wager results.
- Strategy ownership reads.

Fix with extra review:

- `profile_roles_select_own`, because it exposes trusted role assignment state.
- `strategy_versions_select_owner`, because it uses a nested `exists` query.

Do not ignore:

- Direct `auth.uid()` owner policies on user-facing workflow tables.

Do not fix in this task:

- This task is analysis-only. No migration or policy rewrite is authorized here.

## Future Migration Guidance

Recommended future migration:

```text
supabase/migrations/0014_rls_initplan_optimization.sql
```

The future migration should:

- Be append-only.
- Preserve every policy name, command, role, `using`, and `with check` access rule.
- Change only direct `auth.uid()` calls to `(select auth.uid())`.
- Avoid opening shared Opportunity, recommendation, or marketplace reads.
- Avoid broad grants.
- Avoid disabling RLS.
- Avoid user-editable metadata for authorization.
- Leave existing migration files untouched.

Implementation options:

- Use `alter policy` where the full `using` or `with check` expression can be rewritten cleanly.
- Use `drop policy if exists` plus `create policy` if that is clearer and safer for preserving commands and roles.

## Verification Checklist For Future RLS Migration

Before applying:

1. Confirm target project is Dev `strideo-dev / ntxtakbggtljjbalgris`.
2. Confirm migration history includes `0001` through `0013`.
3. Confirm `0014_rls_initplan_optimization` is pending.
4. Review generated SQL and compare each policy against this analysis.
5. Confirm no production credentials or production project ref are used.

After applying to Dev:

1. Confirm migration history includes `0014_rls_initplan_optimization`.
2. Count policies by table and command.
3. Confirm RLS remains enabled on all public tables.
4. Confirm no broad grants to `anon` or `authenticated` were introduced.
5. Re-run Supabase performance advisors.
6. Confirm targeted `auth_rls_initplan` warnings are resolved or explicitly documented.
7. Re-run Supabase security advisors.
8. Run owner-access smoke tests when test users exist.
9. Run negative-access checks to confirm users cannot read, insert, update, or delete another user's rows.
10. Run `npm run lint` and `npm run build` if application code changed.
11. Run `git diff --check`.
12. Document the execution results in a Phase 1H RLS migration execution report.

## Production Reminder

Production remains untouched.

Do not inspect, migrate, or verify production unless production work is explicitly authorized in the current task.
