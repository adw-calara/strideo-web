# Opportunity Scoring Contract

Date: 2026-06-22
Baseline: `main` at or after PR #85 merge commit `746402e50e1fea97736d0fa845246a6d4dc189b9`

## Purpose

This document defines the first Opportunity-facing feature snapshot and
value-scoring result contract. It prepares the next quality layer for real
model-backed Opportunity scoring without implementing real ML, fake ML, wager
recommendations, Bet Sheet, Alerts, Assistant, settlement, ROI, or provider
ingestion expansion.

The contract lives in `lib/opportunities/scoring/contracts.ts`.

The first in-memory pre-race builder lives in
`lib/opportunities/scoring/pre-race-snapshot.ts`. It builds contract-shaped
snapshots from already-loaded race, entry, and odds facts, but it does not
persist `feature_snapshots` rows.

## Feature Snapshot Contract

`OpportunityFeatureSnapshot` captures the inputs a future value scorer needs:

- race identity and race date
- optional Opportunity identity through `opportunityId + opportunityRaceDate`
- race-entry and horse identity
- track, surface, distance, class, and condition context when available
- measured market inputs from morning line or odds snapshots when available
- feature snapshot lineage and source lineage references
- explicit readiness status and missing-feature reasons

Current schema/read-model fields may populate the supported identity, race,
entry, track, and market-input shape. Future-required fields remain optional and
must stay explicit when unavailable. They should be represented through
`missingFeatureReasons`, not filled with synthetic values.

Feature snapshot versioning is separate from model runtime versioning:

- `featureContractVersion`
- `snapshotSchemaVersion`

Neither field is a trained model version.

## Value-Scoring Result Contract

`ValueScoringResult` is a discriminated contract with two states:

- `blocked`: required inputs are unavailable. Probability, edge, confidence,
  and value fields must be `null`.
- `scored`: a future real model produced auditable value output.

Future scored outputs can represent:

- estimated win probability
- market-implied probability
- edge delta
- confidence
- value score
- explanation factors
- model key and model version
- input feature snapshot reference
- Opportunity identity linkage where applicable

The `modelVersion` field belongs only to scored outputs. It must stay separate
from `featureContractVersion` and `snapshotSchemaVersion`.

## Readiness And Safety

The contract provides deterministic helpers for:

- building feature snapshots with readiness status
- preserving feature snapshot references
- validating value-scoring output shape
- blocking synthetic scoring values when inputs are unavailable
- preserving composite Opportunity identity where applicable

This is not a runtime scorer and does not query Supabase. It does not use a
service-role client, bypass RLS, write provider ingestion data, touch production,
or create migrations.

## Pre-Race Snapshot Builder

The pre-race builder is an in-memory bridge from the contract to future feature
materialization. It:

- builds `OpportunityFeatureSnapshot` objects from pre-race race, entry, and
  market facts supplied by the caller
- uses morning line odds only as a trusted pre-race entry field
- uses live odds snapshots only when `snapshotAt` is strictly before a trusted
  pre-race cutoff, defaulting to `race.scheduledAt`
- excludes odds with missing/invalid timing, post-cutoff timing, or unusable
  market probability
- records excluded result, payout, settlement, and other outcome-derived inputs
  in the audit envelope instead of adding them to the snapshot
- returns no prediction, value score, wager recommendation, or model runtime
  version

The builder also returns audit flags confirming that no feature snapshot,
prediction output, score, or wager was written. PR #89 added a separate
Dev-only materialization path for persisted `feature_snapshots`; that path
remains outside the pure builder and does not create prediction outputs,
Opportunity scores, wagers, or production data.

## Next Slice

The next recommended slice should build on the Dev-only persisted feature
snapshot lineage without creating fake model outputs or writing production data.
Real model-backed scoring should come only after model-version registry usage,
prediction output lineage, broader leakage checks, and production-readiness
boundaries are validated.
