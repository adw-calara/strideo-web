-- Phase 1H-B migration design: RLS initplan optimization.
-- Purpose: preserve existing owner-policy behavior while replacing direct
-- auth.uid() calls with scalar subqueries so Postgres can evaluate the
-- authenticated user id once per statement.
-- Dependencies: 0001 through 0013 applied in order.
-- Execution note: policy rewrite only. Do not alter grants, table structures,
-- RLS enablement, indexes, or data in this phase.

begin;

-- profiles_select_own: preserve own-profile read access.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (user_id = (select auth.uid()));

-- subscriptions_select_own: preserve own subscription read access.
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own
  on public.subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

-- entitlements_select_own: preserve own entitlement read access.
drop policy if exists entitlements_select_own on public.entitlements;
create policy entitlements_select_own
  on public.entitlements for select
  to authenticated
  using (user_id = (select auth.uid()));

-- profile_roles_select_own: preserve own trusted role read access.
drop policy if exists profile_roles_select_own on public.profile_roles;
create policy profile_roles_select_own
  on public.profile_roles for select
  to authenticated
  using (user_id = (select auth.uid()));

-- user_devices_*: preserve owner-scoped device registry access.
drop policy if exists user_devices_select_own on public.user_devices;
create policy user_devices_select_own
  on public.user_devices for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_devices_insert_own on public.user_devices;
create policy user_devices_insert_own
  on public.user_devices for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists user_devices_update_own on public.user_devices;
create policy user_devices_update_own
  on public.user_devices for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists user_devices_delete_own on public.user_devices;
create policy user_devices_delete_own
  on public.user_devices for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- watchlist_items_*: preserve owner-scoped Opportunity workflow state access.
drop policy if exists watchlist_items_select_own on public.watchlist_items;
create policy watchlist_items_select_own
  on public.watchlist_items for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists watchlist_items_insert_own on public.watchlist_items;
create policy watchlist_items_insert_own
  on public.watchlist_items for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists watchlist_items_update_own on public.watchlist_items;
create policy watchlist_items_update_own
  on public.watchlist_items for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists watchlist_items_delete_own on public.watchlist_items;
create policy watchlist_items_delete_own
  on public.watchlist_items for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- daily_bet_sheets_*: preserve owner-scoped daily bet sheet access.
drop policy if exists daily_bet_sheets_select_own on public.daily_bet_sheets;
create policy daily_bet_sheets_select_own
  on public.daily_bet_sheets for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists daily_bet_sheets_insert_own on public.daily_bet_sheets;
create policy daily_bet_sheets_insert_own
  on public.daily_bet_sheets for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists daily_bet_sheets_update_own on public.daily_bet_sheets;
create policy daily_bet_sheets_update_own
  on public.daily_bet_sheets for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists daily_bet_sheets_delete_own on public.daily_bet_sheets;
create policy daily_bet_sheets_delete_own
  on public.daily_bet_sheets for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- daily_bet_sheet_entries_*: preserve owner-scoped bet sheet entry access.
drop policy if exists daily_bet_sheet_entries_select_own on public.daily_bet_sheet_entries;
create policy daily_bet_sheet_entries_select_own
  on public.daily_bet_sheet_entries for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists daily_bet_sheet_entries_insert_own on public.daily_bet_sheet_entries;
create policy daily_bet_sheet_entries_insert_own
  on public.daily_bet_sheet_entries for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists daily_bet_sheet_entries_update_own on public.daily_bet_sheet_entries;
create policy daily_bet_sheet_entries_update_own
  on public.daily_bet_sheet_entries for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists daily_bet_sheet_entries_delete_own on public.daily_bet_sheet_entries;
create policy daily_bet_sheet_entries_delete_own
  on public.daily_bet_sheet_entries for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- daily_bet_sheet_events_*: preserve owner-scoped append-only event access.
drop policy if exists daily_bet_sheet_events_select_own on public.daily_bet_sheet_events;
create policy daily_bet_sheet_events_select_own
  on public.daily_bet_sheet_events for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists daily_bet_sheet_events_insert_own on public.daily_bet_sheet_events;
create policy daily_bet_sheet_events_insert_own
  on public.daily_bet_sheet_events for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- user_recorded_wagers_*: preserve owner-scoped recorded wager access.
drop policy if exists user_recorded_wagers_select_own on public.user_recorded_wagers;
create policy user_recorded_wagers_select_own
  on public.user_recorded_wagers for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_recorded_wagers_insert_own on public.user_recorded_wagers;
create policy user_recorded_wagers_insert_own
  on public.user_recorded_wagers for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists user_recorded_wagers_update_own on public.user_recorded_wagers;
create policy user_recorded_wagers_update_own
  on public.user_recorded_wagers for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists user_recorded_wagers_delete_own on public.user_recorded_wagers;
create policy user_recorded_wagers_delete_own
  on public.user_recorded_wagers for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- alert_preferences_*: preserve owner-scoped alert preference access.
drop policy if exists alert_preferences_select_own on public.alert_preferences;
create policy alert_preferences_select_own
  on public.alert_preferences for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists alert_preferences_insert_own on public.alert_preferences;
create policy alert_preferences_insert_own
  on public.alert_preferences for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists alert_preferences_update_own on public.alert_preferences;
create policy alert_preferences_update_own
  on public.alert_preferences for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists alert_preferences_delete_own on public.alert_preferences;
create policy alert_preferences_delete_own
  on public.alert_preferences for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- user_wager_results_*: preserve owner-scoped wager result access.
drop policy if exists user_wager_results_select_own on public.user_wager_results;
create policy user_wager_results_select_own
  on public.user_wager_results for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_wager_results_insert_own on public.user_wager_results;
create policy user_wager_results_insert_own
  on public.user_wager_results for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists user_wager_results_update_own on public.user_wager_results;
create policy user_wager_results_update_own
  on public.user_wager_results for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- strategies_select_owner: preserve owner-only strategy reads.
drop policy if exists strategies_select_owner on public.strategies;
create policy strategies_select_owner
  on public.strategies for select
  to authenticated
  using (owner_user_id = (select auth.uid()));

-- strategy_versions_select_owner: preserve nested owner check while caching auth.uid().
drop policy if exists strategy_versions_select_owner on public.strategy_versions;
create policy strategy_versions_select_owner
  on public.strategy_versions for select
  to authenticated
  using (
    exists (
      select 1
      from public.strategies s
      where s.id = strategy_versions.strategy_id
        and s.owner_user_id = (select auth.uid())
    )
  );

commit;
