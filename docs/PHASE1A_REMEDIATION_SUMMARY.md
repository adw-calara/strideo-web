# Phase 1A Remediation Summary

## Status

PR #5 has been remediated in design only.

No migrations were applied, no Supabase tables were created, and no application
code was written.

## Summary

| Blocker | Fix | Risk Reduction | Remaining Risks |
| --- | --- | --- | --- |
| User-owned child rows could reference another user's parent rows | Added owner-scoped composite FKs using `(id, user_id)` parent uniqueness for daily bet sheet entries, daily bet sheet events, user recorded wagers, and user wager results; daily bet sheet entry events also include `daily_bet_sheet_id` in the FK | Prevents cross-user parent/child relationships even if UUIDs are leaked and browser grants are added later | API tests still need to prove each user workflow mutation path. |
| Race-date integrity gaps | Added composite `(id, race_date)` uniqueness and race-date FKs for wager legs, result entries, recommendation results, and closing odds snapshots | Preserves partition integrity, race snapshot lineage, and analytics correctness | Local/shadow migration execution should verify all composite constraints apply cleanly. |
| Profile and strategy update policies were too broad | Removed direct authenticated insert/update policies for `profiles`, `strategies`, and `strategy_versions` | Keeps sensitive status, entitlement, publication, license, and validation fields server-owned | Future browser mutation paths need explicit server APIs or column-level grant design. |
| `event_log` exposed a future user-select path | Removed `event_log_select_own_user_events` | Keeps audit payloads server-only and prevents accidental Data API exposure | A separate sanitized activity/notification table is still needed for user-facing audit-style history. |

## Updated Counts

- Application tables: 67
- Default partition tables: 9
- RLS policies: 35
- Indexes: 94

## Remaining Risks

- Migrations still need a local/shadow database execution test before any live
  Supabase application.
- Monthly partition automation remains required before production ingestion.
- Browser grants remain intentionally deferred until RLS policy tests exist.
- Full mobile offline sync still needs conflict rules and sync checkpoints.
- Provider identity reconciliation remains future work before multi-provider
  ingestion.
- Data strategy operations remain future work: archive lifecycle jobs, feature
  materialization, monthly retraining orchestration, and prediction partition
  automation.
