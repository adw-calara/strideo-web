# Phase 1B Application Readiness Review

## Approval Status

Ready for Phase 1B execution planning review.

The Phase 1A migration set is approved for planning the Supabase dev application
step, but migrations must not be applied until the user explicitly approves
execution.

## Readiness Summary

The migrations are ready to apply to Supabase dev after the pre-application
checklist in `docs/PHASE1B_MIGRATION_APPLICATION_PLAN.md` passes.

Readiness basis:

- PR #5 was merged.
- `docs/PHASE1A_FINAL_APPROVAL.md` states `APPROVED TO MERGE`.
- Phase 1A migration blockers were remediated.
- Historical data architecture and AI training strategy were integrated.
- RLS is designed for a no-browser-grants posture.
- No application code or seed data is required for migration application.

## Review Results

### Migration Order

Status: ready.

The migration order is numeric and dependency-aware:

- Foundation security hardening first.
- Extensions, schemas, enums, and domains second.
- Reference tables before transaction tables.
- Transaction tables before Opportunity, wager, user workflow, and learning
  tables.
- Audit tables before final lineage verification.
- RLS before default partitions and indexes.
- Historical archive, feature-store, prediction, and training tables last.

### Supabase Security

Status: ready with guardrails.

- No broad application grants should be introduced.
- `service_role` must remain server-only.
- Data API exposure must remain off unless explicitly granted later.
- RLS must be verified after every application-table migration.
- Audit tables must remain server-only.

### User-Owned Data Integrity

Status: ready.

User-owned child tables use owner-scoped composite foreign keys to prevent
cross-user references.

Verification must confirm:

- `daily_bet_sheet_entries(daily_bet_sheet_id, user_id)`
- `daily_bet_sheet_events(daily_bet_sheet_id, user_id)`
- `daily_bet_sheet_events(daily_bet_sheet_entry_id, user_id, daily_bet_sheet_id)`
- `user_recorded_wagers(daily_bet_sheet_entry_id, user_id)`
- `user_wager_results(user_recorded_wager_id, user_id)`

### Partition And Race-Date Integrity

Status: ready.

Race-date sensitive relationships use composite race/date foreign keys. Default
partitions are defined for the partitioned parent tables.

Verification must confirm partitions for:

- `races`
- `race_entries`
- `odds_snapshots`
- `opportunities`
- `wager_recommendations`
- `recommendation_results`
- `agent_logs`
- `event_log`
- `prediction_results`

### Historical Data And ML Platform

Status: ready.

The migration set represents:

- raw archive metadata,
- source file tracking,
- ingestion batches,
- feature store tables,
- model training datasets,
- model evaluation metrics,
- prediction runs,
- permanent prediction results,
- and the 30-day live prediction cache.

### Analytics Warehouse Path

Status: ready.

The schema preserves warehouse-friendly facts through:

- append-only records,
- source file and archive metadata,
- job lineage,
- timestamps,
- partition keys,
- model and feature lineage,
- and permanent prediction history.

## Remaining Non-Blocking Risks

- The migration set has not yet been executed against a local/shadow database in
  this phase.
- Monthly partition automation is not implemented.
- Archive lifecycle, feature materialization, monthly retraining, and prediction
  serving jobs are not implemented.
- Browser grants and browser RLS tests remain deferred.
- Supabase advisor output is still required after application.
- Generated Supabase types are still required after application.

## Required Before Execution

Before applying migrations:

1. Confirm the Supabase project is dev only.
2. Confirm automatic table exposure is off.
3. Confirm RLS auto-enable trigger is active.
4. Confirm no application tables currently exist.
5. Confirm no secrets are committed.
6. Confirm local branch is updated from `main`.
7. Confirm backup/restore path.
8. Confirm the user has explicitly approved execution.

## Final Decision

Phase 1B migration application planning is ready for review.

Do not apply migrations yet.
