import { MODEL_REQUIREMENTS } from "./model-requirements";
import type {
  CapabilityStatus,
  DataCapabilityInput,
  DataRequirement,
  DataRequirementKey,
  FieldCapability,
  ModelKey,
  ModelReadinessResult,
  ModelReadinessStatus,
} from "./types";

function normalizeCapability(capability: FieldCapability | undefined): CapabilityStatus {
  if (capability === undefined) {
    return "missing";
  }

  if (typeof capability === "string") {
    return capability;
  }

  return capability.status;
}

function isRequired(requirement: DataRequirement): boolean {
  return requirement.group !== "optional_enhancement";
}

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function isAtLeastPartial(status: ModelReadinessStatus | undefined): boolean {
  return status === "partial" || status === "ready";
}

function dependencyReadiness(
  modelKey: ModelKey,
  input: DataCapabilityInput,
): ModelReadinessStatus | undefined {
  return input.dependencyReadiness?.[modelKey];
}

export function checkModelReadiness(
  modelKey: ModelKey,
  input: DataCapabilityInput,
): ModelReadinessResult {
  const model = MODEL_REQUIREMENTS[modelKey];
  const requiredFieldsPresent: DataRequirementKey[] = [];
  const requiredFieldsMissing: DataRequirementKey[] = [];
  const partialFields: DataRequirementKey[] = [];
  const blockingReasons: string[] = [];
  const recommendedNextDataWork: string[] = [];

  for (const requirement of model.requirements) {
    const status = normalizeCapability(input.fields[requirement.key]);

    if (status === "partial") {
      partialFields.push(requirement.key);
      if (isRequired(requirement)) {
        recommendedNextDataWork.push(requirement.recommendedNextDataWork);
      }
    }

    if (!isRequired(requirement)) {
      continue;
    }

    if (status === "present") {
      requiredFieldsPresent.push(requirement.key);
      continue;
    }

    requiredFieldsMissing.push(requirement.key);
    recommendedNextDataWork.push(requirement.recommendedNextDataWork);

    if (requirement.group === "required_now") {
      blockingReasons.push(requirement.missingMessage);
    }
  }

  for (const dependency of model.dependencies ?? []) {
    const status = dependencyReadiness(dependency, input);

    if (!isAtLeastPartial(status)) {
      blockingReasons.push(
        `${model.modelKey} requires ${dependency} to be at least partial before it can run safely.`,
      );
      recommendedNextDataWork.push(
        `Bring ${dependency} to partial readiness before evaluating ${model.modelKey}.`,
      );
    }
  }

  const opportunityLinkageSatisfied =
    !model.opportunityLinkageRequired ||
    normalizeCapability(input.fields.opportunity_attribution) === "present";

  if (!opportunityLinkageSatisfied) {
    blockingReasons.push(
      `${model.modelKey} must link prediction, value, recommendation, and performance evidence back to Opportunity.`,
    );
    recommendedNextDataWork.push(
      "Prove Opportunity attribution through opportunities, opportunity_subjects, opportunity_scores, recommendations, results, and rollups.",
    );
  }

  const status: ModelReadinessStatus =
    blockingReasons.length > 0
      ? "blocked"
      : requiredFieldsMissing.length > 0 || partialFields.length > 0
        ? "partial"
        : "ready";

  return {
    modelKey,
    status,
    requiredFieldsPresent: unique(requiredFieldsPresent),
    requiredFieldsMissing: unique(requiredFieldsMissing),
    partialFields: unique(partialFields),
    blockingReasons: unique(blockingReasons),
    duplicateRiskWarnings: unique([
      ...model.duplicateRiskWarnings,
      ...(input.duplicateRiskWarnings ?? []),
    ]),
    recommendedNextDataWork: unique(recommendedNextDataWork),
    opportunityLinkageSatisfied,
  };
}

export function checkAllModelReadiness(
  input: DataCapabilityInput,
): Record<ModelKey, ModelReadinessResult> {
  const fundamental = checkModelReadiness("fundamental_win_probability_v1", input);
  const market = checkModelReadiness("market_implied_probability_v1", input);
  const benter = checkModelReadiness("benter_blended_probability_v1", {
    ...input,
    dependencyReadiness: {
      ...input.dependencyReadiness,
      fundamental_win_probability_v1: fundamental.status,
      market_implied_probability_v1: market.status,
    },
  });
  const value = checkModelReadiness("value_overlay_v1", {
    ...input,
    dependencyReadiness: {
      ...input.dependencyReadiness,
      market_implied_probability_v1: market.status,
    },
  });
  const harville = checkModelReadiness("harville_finish_order_v1", {
    ...input,
    dependencyReadiness: {
      ...input.dependencyReadiness,
      fundamental_win_probability_v1: fundamental.status,
    },
  });

  return {
    fundamental_win_probability_v1: fundamental,
    market_implied_probability_v1: market,
    benter_blended_probability_v1: benter,
    value_overlay_v1: value,
    harville_finish_order_v1: harville,
  };
}
