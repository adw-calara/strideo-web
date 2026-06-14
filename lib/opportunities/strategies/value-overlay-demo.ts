import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  FEATURE_SET_KEY,
  FEATURE_SET_VERSION,
  SCORING_VERSION,
  raiseOpportunityGenerationError,
} from "@/lib/opportunities/features";
import type { OpportunityCandidateScore } from "@/lib/opportunities/scoring/value-overlay-demo";

export const STRATEGY_SLUG = "value_overlay_demo";
export const STRATEGY_VERSION_NUMBER = 1;

const MINIMUM_SCORE = 58;
const MINIMUM_CONFIDENCE = 42;
const MINIMUM_PROBABILITY_EDGE = 0.025;

type StrategyRow = {
  id: string;
  current_version_id: string | null;
};

type StrategyVersionRow = {
  id: string;
};

export type StrategyMatchDecision = {
  qualified: boolean;
  reason: string;
  thresholds: {
    minimumScore: number;
    minimumConfidence: number;
    minimumProbabilityEdge: number;
  };
};

export function matchOpportunityStrategy(
  score: OpportunityCandidateScore,
): StrategyMatchDecision {
  const thresholds = {
    minimumScore: MINIMUM_SCORE,
    minimumConfidence: MINIMUM_CONFIDENCE,
    minimumProbabilityEdge: MINIMUM_PROBABILITY_EDGE,
  };

  if (score.edge < MINIMUM_PROBABILITY_EDGE) {
    return {
      qualified: false,
      reason: "Placeholder probability edge is below the demo threshold.",
      thresholds,
    };
  }

  if (score.score < MINIMUM_SCORE) {
    return {
      qualified: false,
      reason: "Composite demo score is below the strategy threshold.",
      thresholds,
    };
  }

  if (score.confidence < MINIMUM_CONFIDENCE) {
    return {
      qualified: false,
      reason: "Available data confidence is below the strategy threshold.",
      thresholds,
    };
  }

  return {
    qualified: true,
    reason: "Demo value-overlay thresholds were met.",
    thresholds,
  };
}

async function ensureStrategy() {
  const supabase = createServiceRoleClient();
  const { data: existing, error: existingError } = await supabase
    .from("strategies")
    .select("id,current_version_id")
    .eq("slug", STRATEGY_SLUG)
    .limit(1)
    .maybeSingle<StrategyRow>();

  if (existingError) {
    raiseOpportunityGenerationError("strategy lookup", existingError.message);
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("strategies")
    .insert({
      slug: STRATEGY_SLUG,
      name: "Demo Value Overlay",
      description:
        "System-owned deterministic placeholder strategy for Dev Opportunity generation.",
      visibility: "system",
      status: "active",
      publication_status: "published",
      license_type: "system",
      validation_status: "testing",
      metadata: {
        placeholder_only: true,
        scoring_version: SCORING_VERSION,
      },
    })
    .select("id,current_version_id")
    .single<StrategyRow>();

  if (error) {
    raiseOpportunityGenerationError("strategy insert", error.message);
  }

  if (!data) {
    raiseOpportunityGenerationError(
      "strategy insert",
      "No strategy id returned.",
    );
  }

  return data;
}

async function ensureStrategyVersion(strategyId: string) {
  const supabase = createServiceRoleClient();
  const { data: existing, error: existingError } = await supabase
    .from("strategy_versions")
    .select("id")
    .eq("strategy_id", strategyId)
    .eq("version_number", STRATEGY_VERSION_NUMBER)
    .limit(1)
    .maybeSingle<StrategyVersionRow>();

  if (existingError) {
    raiseOpportunityGenerationError(
      "strategy version lookup",
      existingError.message,
    );
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("strategy_versions")
    .insert({
      strategy_id: strategyId,
      version_number: STRATEGY_VERSION_NUMBER,
      name: "Demo Value Overlay v1",
      description:
        "Deterministic placeholder configuration for Dev Opportunity generation.",
      config: {
        placeholder_only: true,
        thresholds: {
          minimum_score: MINIMUM_SCORE,
          minimum_confidence: MINIMUM_CONFIDENCE,
          minimum_probability_edge: MINIMUM_PROBABILITY_EDGE,
        },
      },
      feature_contract: {
        feature_set_key: FEATURE_SET_KEY,
        feature_set_version: FEATURE_SET_VERSION,
      },
      scoring_contract: {
        scoring_version: SCORING_VERSION,
        method: "deterministic_demo_value_overlay",
      },
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single<StrategyVersionRow>();

  if (error) {
    raiseOpportunityGenerationError("strategy version insert", error.message);
  }

  if (!data) {
    raiseOpportunityGenerationError(
      "strategy version insert",
      "No strategy version id returned.",
    );
  }

  return data;
}

export async function ensureDemoValueOverlayStrategy() {
  const supabase = createServiceRoleClient();
  const strategy = await ensureStrategy();
  const version = await ensureStrategyVersion(strategy.id);

  if (strategy.current_version_id !== version.id) {
    const { error } = await supabase
      .from("strategies")
      .update({
        current_version_id: version.id,
        status: "active",
        publication_status: "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", strategy.id);

    if (error) {
      raiseOpportunityGenerationError("strategy update", error.message);
    }
  }

  return {
    strategyId: strategy.id,
    strategyVersionId: version.id,
  };
}
