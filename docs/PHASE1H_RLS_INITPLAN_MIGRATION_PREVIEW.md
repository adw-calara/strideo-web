# Phase 1H-B RLS Initplan Migration Preview

Status: MIGRATION PREPARED - NOT APPLIED

Date: June 7, 2026

## Summary

This preview describes the planned append-only migration:

```text
supabase/migrations/0014_rls_initplan_optimization.sql
```

The migration recreates the high-confidence RLS policies documented in `docs/PHASE1H_RLS_INITPLAN_ANALYSIS.md` and replaces direct `auth.uid()` calls with scalar subqueries.

Production touched: no.

## Files Prepared

- `supabase/migrations/0014_rls_initplan_optimization.sql`
- `docs/PHASE1H_RLS_INITPLAN_MIGRATION_PREVIEW.md`

## Policies Changed

The migration recreates the following `35` policies with the same names, commands, target roles, and ownership predicates:

| Table | Policies |
| --- | --- |
| `profiles` | `profiles_select_own` |
| `subscriptions` | `subscriptions_select_own` |
| `entitlements` | `entitlements_select_own` |
| `profile_roles` | `profile_roles_select_own` |
| `user_devices` | `user_devices_select_own`, `user_devices_insert_own`, `user_devices_update_own`, `user_devices_delete_own` |
| `watchlist_items` | `watchlist_items_select_own`, `watchlist_items_insert_own`, `watchlist_items_update_own`, `watchlist_items_delete_own` |
| `daily_bet_sheets` | `daily_bet_sheets_select_own`, `daily_bet_sheets_insert_own`, `daily_bet_sheets_update_own`, `daily_bet_sheets_delete_own` |
| `daily_bet_sheet_entries` | `daily_bet_sheet_entries_select_own`, `daily_bet_sheet_entries_insert_own`, `daily_bet_sheet_entries_update_own`, `daily_bet_sheet_entries_delete_own` |
| `daily_bet_sheet_events` | `daily_bet_sheet_events_select_own`, `daily_bet_sheet_events_insert_own` |
| `user_recorded_wagers` | `user_recorded_wagers_select_own`, `user_recorded_wagers_insert_own`, `user_recorded_wagers_update_own`, `user_recorded_wagers_delete_own` |
| `alert_preferences` | `alert_preferences_select_own`, `alert_preferences_insert_own`, `alert_preferences_update_own`, `alert_preferences_delete_own` |
| `user_wager_results` | `user_wager_results_select_own`, `user_wager_results_insert_own`, `user_wager_results_update_own` |
| `strategies` | `strategies_select_owner` |
| `strategy_versions` | `strategy_versions_select_owner` |

No policies are renamed.

## Before/After Pattern Summary

Straight owner checks:

```sql
user_id = auth.uid()
```

become:

```sql
user_id = (select auth.uid())
```

Strategy owner checks:

```sql
owner_user_id = auth.uid()
```

become:

```sql
owner_user_id = (select auth.uid())
```

Nested strategy-version ownership preserves the `exists` query and changes only the direct auth call:

```sql
s.owner_user_id = auth.uid()
```

becomes:

```sql
s.owner_user_id = (select auth.uid())
```

## Why Behavior Should Remain Equivalent

The migration keeps the same:

- Policy names.
- Tables.
- Commands: `select`, `insert`, `update`, and `delete`.
- Role: `authenticated`.
- Owner columns: `user_id` and `owner_user_id`.
- Existing `using` and `with check` semantics.
- Nested `exists` relationship for strategy version reads.

The only intended behavioral difference is query-planning performance: the authenticated user id should be evaluated once per statement instead of repeatedly per row.

## Risk Assessment

Overall risk: low to medium.

Low-risk items:

- Direct owner policies where only `user_id = auth.uid()` changes to `user_id = (select auth.uid())`.
- Insert and update `with check` policies that preserve the same ownership condition.

Medium-risk items:

- `profile_roles_select_own`, because it protects trusted role-assignment state.
- `strategy_versions_select_owner`, because it uses a nested `exists` query.

Mitigation:

- The migration is transactional.
- Policy names and role targeting are preserved.
- No grants are changed.
- RLS is not disabled.
- No shared Opportunity or wager recommendation read policies are added.

## Non-Goals

This migration does not:

- Apply anything to Dev.
- Touch production.
- Disable or enable RLS.
- Alter grants.
- Change table structures.
- Create indexes.
- Open new shared data access.
- Use user-editable metadata for authorization.
- Modify previous migration files.

## Dev Verification Checklist

Before applying:

1. Confirm target project is Dev `strideo-dev / ntxtakbggtljjbalgris`.
2. Confirm migration history includes `0001` through `0013`.
3. Confirm `0014_rls_initplan_optimization` is pending.
4. Confirm production credentials are not being used.
5. Review the migration SQL against `docs/PHASE1H_RLS_INITPLAN_ANALYSIS.md`.

After applying to Dev:

1. Confirm migration history includes `0014_rls_initplan_optimization`.
2. Count policies by table and command.
3. Confirm all `35` recreated policies still target `authenticated`.
4. Confirm RLS remains enabled on all public tables.
5. Confirm no broad table grants to `anon` or `authenticated` were introduced.
6. Re-run Supabase performance advisors.
7. Confirm targeted `auth_rls_initplan` warnings are resolved or documented.
8. Re-run Supabase security advisors.
9. Run owner-access smoke tests when test users exist.
10. Run negative-access checks for user-owned rows when test users exist.
11. Run `git diff --check`.
12. Document results in a Phase 1H-B execution report.

## Production Reminder

Production remains untouched.

Do not inspect, migrate, or verify production unless production work is explicitly authorized in the current task.
