import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  FEATURE_SET_KEY,
  FEATURE_SET_VERSION,
  SCORING_VERSION,
  type JsonRecord,
  type OpportunityFeatures,
  opportunityFeaturesToJsonRecord,
  raiseOpportunityGenerationError,
} from "@/lib/opportunities/features";
import type { OpportunityCandidateScore } from "@/lib/opportunities/scoring/value-overlay-demo";
import {
  STRATEGY_SLUG,
  type StrategyMatchDecision,
} from "@/lib/opportunities/strategies/value-overlay-demo";

export const EXPLANATION_VERSION = "demo-value-overlay-explanation-v1";

type OpportunityRow = {
  id: string;
  race_date: string;
  published_at: string | null;
};

type ChildIdRow = {
  id: string;
};

function candidateKey(
  features: OpportunityFeatures,
  strategyId: string,
  strategyVersionId: string,
) {
  return [
    features.race.raceDate,
    features.race.id,
    features.subject.raceEntryId,
    strategyId,
    strategyVersionId,
    SCORING_VERSION,
  ].join(":");
}

function scoreInputKey(
  candidateIdentityKey: string,
  features: OpportunityFeatures,
) {
  return [
    candidateIdentityKey,
    features.odds.latestOddsSnapshotId ?? "no-latest-odds",
    features.marketMovement.openingOddsSnapshotId ?? "no-opening-odds",
    features.odds.marketProbabilitySource,
  ].join(":");
}

async function ensureStrategyMatch({
  strategyId,
  strategyVersionId,
  features,
  score,
  decision,
  key,
}: {
  strategyId: string;
  strategyVersionId: string;
  features: OpportunityFeatures;
  score: OpportunityCandidateScore;
  decision: StrategyMatchDecision;
  key: string;
}) {
  const supabase = createServiceRoleClient();
  const inputKey = scoreInputKey(key, features);
  const payload = {
    candidate_key: key,
    score_input_key: inputKey,
    scoring_version: SCORING_VERSION,
    feature_set_key: FEATURE_SET_KEY,
    feature_set_version: FEATURE_SET_VERSION,
    placeholder_only: true,
    qualification_reason: decision.reason,
    features: opportunityFeaturesToJsonRecord(features),
    score,
  };
  const { data: existing, error: existingError } = await supabase
    .from("strategy_matches")
    .select("id")
    .eq("strategy_id", strategyId)
    .eq("strategy_version_id", strategyVersionId)
    .eq("race_id", features.race.id)
    .eq("race_date", features.race.raceDate)
    .eq("race_entry_id", features.subject.raceEntryId)
    .contains("payload", { score_input_key: inputKey })
    .limit(1)
    .maybeSingle<ChildIdRow>();

  if (existingError) {
    raiseOpportunityGenerationError(
      "strategy match lookup",
      existingError.message,
    );
  }

  if (existing) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from("strategy_matches")
    .insert({
      strategy_id: strategyId,
      strategy_version_id: strategyVersionId,
      race_id: features.race.id,
      race_date: features.race.raceDate,
      race_entry_id: features.subject.raceEntryId,
      score: score.score,
      confidence: score.confidence,
      edge: score.displayEdge,
      payload,
    })
    .select("id")
    .single<ChildIdRow>();

  if (error) {
    raiseOpportunityGenerationError("strategy match insert", error.message);
  }

  if (!data) {
    raiseOpportunityGenerationError(
      "strategy match insert",
      "No strategy match id returned.",
    );
  }

  return data.id;
}

async function ensureOpportunity({
  strategyId,
  strategyVersionId,
  features,
  key,
}: {
  strategyId: string;
  strategyVersionId: string;
  features: OpportunityFeatures;
  key: string;
}) {
  const supabase = createServiceRoleClient();
  const lookupMetadata = {
    scoring_version: SCORING_VERSION,
    primary_race_entry_id: features.subject.raceEntryId,
  };
  const { data: existing, error: existingError } = await supabase
    .from("opportunities")
    .select("id,race_date,published_at")
    .eq("race_id", features.race.id)
    .eq("race_date", features.race.raceDate)
    .eq("strategy_id", strategyId)
    .eq("strategy_version_id", strategyVersionId)
    .contains("metadata", lookupMetadata)
    .limit(1)
    .maybeSingle<OpportunityRow>();

  if (existingError) {
    raiseOpportunityGenerationError("Opportunity lookup", existingError.message);
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("opportunities")
    .insert({
      race_id: features.race.id,
      race_date: features.race.raceDate,
      opportunity_type: "single_entry",
      state: "candidate",
      strategy_id: strategyId,
      strategy_version_id: strategyVersionId,
      metadata: {
        ...lookupMetadata,
        candidate_key: key,
        strategy_slug: STRATEGY_SLUG,
        placeholder_only: true,
      },
    })
    .select("id,race_date,published_at")
    .single<OpportunityRow>();

  if (error) {
    raiseOpportunityGenerationError("Opportunity insert", error.message);
  }

  if (!data) {
    raiseOpportunityGenerationError(
      "Opportunity insert",
      "No Opportunity row returned.",
    );
  }

  return data;
}

async function ensureOpportunityChildren({
  opportunity,
  strategyMatchId,
  features,
  score,
  decision,
  key,
}: {
  opportunity: OpportunityRow;
  strategyMatchId: string;
  features: OpportunityFeatures;
  score: OpportunityCandidateScore;
  decision: StrategyMatchDecision;
  key: string;
}) {
  const supabase = createServiceRoleClient();
  const payload = {
    candidate_key: key,
    score_input_key: scoreInputKey(key, features),
    scoring_version: SCORING_VERSION,
    placeholder_only: true,
    placeholder_probability_method: score.method,
    market_implied_probability: score.marketImpliedProbability,
    calculated_edge: score.edge,
    qualification_reason: decision.reason,
    calculated_at: score.scoredAt,
    features: opportunityFeaturesToJsonRecord(features),
  };

  const { data: existingSubject, error: existingSubjectError } = await supabase
    .from("opportunity_subjects")
    .select("id")
    .eq("opportunity_id", opportunity.id)
    .eq("race_date", opportunity.race_date)
    .eq("race_entry_id", features.subject.raceEntryId)
    .eq("subject_role", "primary")
    .limit(1)
    .maybeSingle<ChildIdRow>();

  if (existingSubjectError) {
    raiseOpportunityGenerationError(
      "Opportunity subject lookup",
      existingSubjectError.message,
    );
  }

  if (!existingSubject) {
    const { error: subjectError } = await supabase
      .from("opportunity_subjects")
      .insert({
        opportunity_id: opportunity.id,
        race_date: opportunity.race_date,
        race_entry_id: features.subject.raceEntryId,
        subject_role: "primary",
        ordinal: 1,
        weight: 1,
      });

    if (subjectError) {
      raiseOpportunityGenerationError(
        "Opportunity subject insert",
        subjectError.message,
      );
    }
  }

  const { data: existingLink, error: existingLinkError } = await supabase
    .from("opportunity_strategy_matches")
    .select("id")
    .eq("opportunity_id", opportunity.id)
    .eq("race_date", opportunity.race_date)
    .eq("strategy_match_id", strategyMatchId)
    .limit(1)
    .maybeSingle<ChildIdRow>();

  if (existingLinkError) {
    raiseOpportunityGenerationError(
      "Opportunity strategy match link lookup",
      existingLinkError.message,
    );
  }

  if (!existingLink) {
    const { error: linkError } = await supabase
      .from("opportunity_strategy_matches")
      .insert({
        opportunity_id: opportunity.id,
        race_date: opportunity.race_date,
        strategy_match_id: strategyMatchId,
        contribution_score: score.score,
      });

    if (linkError) {
      raiseOpportunityGenerationError(
        "Opportunity strategy match link insert",
        linkError.message,
      );
    }
  }

  const { data: existingScore, error: existingScoreError } = await supabase
    .from("opportunity_scores")
    .select("id")
    .eq("opportunity_id", opportunity.id)
    .eq("race_date", opportunity.race_date)
    .eq("scoring_version", SCORING_VERSION)
    .contains("payload", { score_input_key: payload.score_input_key })
    .limit(1)
    .maybeSingle<ChildIdRow>();

  if (existingScoreError) {
    raiseOpportunityGenerationError(
      "Opportunity score lookup",
      existingScoreError.message,
    );
  }

  const scoreId =
    existingScore?.id ??
    (
      await supabase
        .from("opportunity_scores")
        .insert({
          opportunity_id: opportunity.id,
          race_date: opportunity.race_date,
          score: score.score,
          confidence: score.confidence,
          edge: score.displayEdge,
          fair_value: score.fairValue,
          scoring_version: SCORING_VERSION,
          scored_at: score.scoredAt,
          payload,
        })
        .select("id")
        .single<ChildIdRow>()
    ).data?.id;

  if (!scoreId) {
    raiseOpportunityGenerationError(
      "Opportunity score insert",
      "No score id returned.",
    );
  }

  const { data: existingExplanation, error: existingExplanationError } =
    await supabase
      .from("opportunity_explanations")
      .select("id")
      .eq("opportunity_id", opportunity.id)
      .eq("race_date", opportunity.race_date)
      .eq("explanation_version", EXPLANATION_VERSION)
      .filter(
        "factors",
        "cs",
        JSON.stringify([{ score_input_key: payload.score_input_key }]),
      )
      .limit(1)
      .maybeSingle<ChildIdRow>();

  if (existingExplanationError) {
    raiseOpportunityGenerationError(
      "Opportunity explanation lookup",
      existingExplanationError.message,
    );
  }

  const explanationId =
    existingExplanation?.id ??
    (
      await supabase
        .from("opportunity_explanations")
        .insert({
          opportunity_id: opportunity.id,
          race_date: opportunity.race_date,
          explanation_version: EXPLANATION_VERSION,
          headline: "Value signal detected",
          summary:
            "This Opportunity compares a deterministic placeholder probability estimate with the latest available market-implied probability. This is an early system-generated signal and not a wagering instruction.",
          factors: [
            {
              candidate_key: key,
              score_input_key: payload.score_input_key,
              label: "Placeholder value signal",
              scoring_version: SCORING_VERSION,
              market_implied_probability: score.marketImpliedProbability,
              placeholder_probability: score.placeholderProbability,
              calculated_edge: score.edge,
              qualification_reason: decision.reason,
            },
          ],
          generated_at: score.scoredAt,
        })
        .select("id")
        .single<ChildIdRow>()
    ).data?.id;

  if (!explanationId) {
    raiseOpportunityGenerationError(
      "Opportunity explanation insert",
      "No explanation id returned.",
    );
  }

  await recordOpportunityLifecycleEvent({
    opportunity,
    key,
    payload,
  });

  return {
    scoreId,
    explanationId,
  };
}

export async function recordOpportunityLifecycleEvent({
  opportunity,
  key,
  payload,
}: {
  opportunity: OpportunityRow;
  key: string;
  payload: JsonRecord;
}) {
  const supabase = createServiceRoleClient();
  const { data: existingEvent, error: existingEventError } = await supabase
    .from("opportunity_events")
    .select("id")
    .eq("opportunity_id", opportunity.id)
    .eq("race_date", opportunity.race_date)
    .eq("event_type", "published")
    .contains("payload", { candidate_key: key })
    .limit(1)
    .maybeSingle<ChildIdRow>();

  if (existingEventError) {
    raiseOpportunityGenerationError(
      "Opportunity event lookup",
      existingEventError.message,
    );
  }

  if (!existingEvent) {
    const { error: eventError } = await supabase
      .from("opportunity_events")
      .insert({
        opportunity_id: opportunity.id,
        race_date: opportunity.race_date,
        previous_state: opportunity.published_at ? "published" : "candidate",
        new_state: "published",
        event_type: "published",
        actor_type: "system",
        reason: "Informational Opportunity published from placeholder value signal.",
        payload,
      });

    if (eventError) {
      raiseOpportunityGenerationError(
        "Opportunity event insert",
        eventError.message,
      );
    }
  }
}

export async function persistOpportunityCandidate({
  strategyId,
  strategyVersionId,
  features,
  score,
  decision,
}: {
  strategyId: string;
  strategyVersionId: string;
  features: OpportunityFeatures;
  score: OpportunityCandidateScore;
  decision: StrategyMatchDecision;
}) {
  const supabase = createServiceRoleClient();
  const key = candidateKey(features, strategyId, strategyVersionId);
  const strategyMatchId = await ensureStrategyMatch({
    strategyId,
    strategyVersionId,
    features,
    score,
    decision,
    key,
  });
  const opportunity = await ensureOpportunity({
    strategyId,
    strategyVersionId,
    features,
    key,
  });
  const { scoreId, explanationId } = await ensureOpportunityChildren({
    opportunity,
    strategyMatchId,
    features,
    score,
    decision,
    key,
  });
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("opportunities")
    .update({
      state: "published",
      current_score: score.score,
      current_confidence: score.confidence,
      current_edge: score.displayEdge,
      latest_score_id: scoreId,
      latest_explanation_id: explanationId,
      published_at: opportunity.published_at ?? now,
      updated_at: now,
      metadata: {
        scoring_version: SCORING_VERSION,
        primary_race_entry_id: features.subject.raceEntryId,
        candidate_key: key,
        strategy_slug: STRATEGY_SLUG,
        placeholder_only: true,
        last_calculated_at: score.scoredAt,
        feature_set_key: FEATURE_SET_KEY,
        feature_set_version: FEATURE_SET_VERSION,
      },
    })
    .eq("id", opportunity.id)
    .eq("race_date", opportunity.race_date);

  if (error) {
    raiseOpportunityGenerationError("Opportunity publish update", error.message);
  }

  return opportunity.id;
}
