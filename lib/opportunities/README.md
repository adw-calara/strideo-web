# Opportunity Module

`Opportunity` is the central product aggregate in Strideo. This module keeps
generation, persistence, and feed reads organized around that rule.

## File Map

- `generation.ts`
  - Orchestrates demo Opportunity generation.
  - Loads eligible race facts, extracts features, scores candidates, applies the
    strategy decision, and persists qualified Opportunities.
  - Supports dry-run candidate analysis without writing Opportunity rows.
  - Should stay thin. If logic grows, move it into one of the modules below.

- `features.ts`
  - Loads race, entry, and odds facts needed for Opportunity generation.
  - Converts raw database rows into the structured `OpportunityFeatures`
    contract.
  - Owns shared generation constants such as feature set and scoring version
    identifiers.

- `scoring/value-overlay-demo.ts`
  - Scores a candidate using the deterministic demo value-overlay method.
  - Does not query the database and does not persist anything.
  - Future model-backed scorers should live beside this file instead of
    replacing it in place.

- `scoring/contracts.ts`
  - Defines the Opportunity feature snapshot and value-scoring result contract
    for future real model-backed scoring.
  - Separates feature contract/schema versioning from model runtime versioning.
  - Provides deterministic readiness/shape validation only; it is not real ML,
    fake ML, a wager recommendation, or a runtime scorer.

- `scoring/pre-race-snapshot.ts`
  - Builds in-memory Opportunity feature snapshots from pre-race race, entry,
    and odds facts according to the scoring contract.
  - Applies a strict odds cutoff rule: live odds are used only when
    `snapshotAt` is before a trusted pre-race cutoff.
  - Does not persist feature snapshots, predictions, scores, wagers, or model
    outputs.

- `strategies/value-overlay-demo.ts`
  - Owns demo strategy identity, version setup, and qualification thresholds.
  - Decides whether a scored candidate qualifies as an Opportunity candidate.
  - Strategy-specific rules belong here, not in `generation.ts`.

- `persistence.ts`
  - Persists the Opportunity-centered write model.
  - Writes strategy matches, Opportunities, subjects, scores, explanations, and
    lifecycle events.
  - All generated child records should link back to an Opportunity wherever the
    schema supports it.

- `data-access.ts`
  - Reads published Opportunities for product surfaces such as the Opportunity
    Feed.
  - Keeps UI pages from querying Supabase tables directly.

## Generation Flow

```text
generation.ts
  -> loadEligibleRaceFacts()
  -> extractOpportunityFeatures()
  -> scoreOpportunityCandidate()
  -> matchOpportunityStrategy()
  -> ensureDemoValueOverlayStrategy() when write mode has qualified candidates
  -> persistOpportunityCandidate()
       -> strategy_matches
       -> opportunities
       -> opportunity_subjects
       -> opportunity_strategy_matches
       -> opportunity_scores
       -> opportunity_explanations
       -> opportunity_events
```

The current demo flow is deterministic placeholder logic. It is intentionally
replaceable and should not be treated as real ML.

## Extension Rules

When adding a new Opportunity generator:

1. Keep the public orchestration entrypoint in `generation.ts` small.
2. Add feature contracts to `features.ts` or a feature-specific module if the
   contract becomes large.
3. Add scoring logic under `scoring/`.
4. Add strategy rules and strategy version setup under `strategies/`.
5. Use `persistence.ts` or a similarly named persistence module for writes.
6. Preserve append-only generated facts: scores, explanations, events, and
   future wager recommendations should retain history.
7. Keep recommendations, alerts, wagers, results, explanations, and performance
   metrics linked back to an Opportunity wherever possible.
8. Use `scoring/contracts.ts` for feature snapshot and value-scoring output
   shape before adding model-backed scoring; do not populate missing future
   inputs with synthetic values.
9. Use `scoring/pre-race-snapshot.ts` for audited in-memory pre-race feature
   snapshots before adding any persisted `feature_snapshots` write path.

## Non-Goals

- Do not put page/component rendering logic in this module.
- Do not put generic race-card UI data access here unless it directly supports
  Opportunities.
- Do not add Supabase migrations from this module directory.
- Do not put service-role keys or browser-facing secrets in any Opportunity
  module.
