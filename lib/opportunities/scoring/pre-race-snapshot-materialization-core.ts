import { createHash } from "node:crypto";

import {
  OPPORTUNITY_FEATURE_CONTRACT_VERSION,
  OPPORTUNITY_FEATURE_SNAPSHOT_SCHEMA_VERSION,
  buildOpportunityFeatureSnapshot,
  type OpportunityFeatureSnapshot,
} from "./contracts";
import {
  buildPreRaceOpportunityFeatureSnapshot,
  type PreRaceFeatureSnapshotBuildResult,
  type PreRaceFeatureSnapshotEntry,
  type PreRaceFeatureSnapshotRace,
  type PreRaceOddsSnapshotInput,
} from "./pre-race-snapshot";

export const PRE_RACE_FEATURE_SNAPSHOT_SET_KEY = "opportunity_pre_race";
export const PRE_RACE_FEATURE_SNAPSHOT_SET_VERSION =
  `${OPPORTUNITY_FEATURE_CONTRACT_VERSION}:${OPPORTUNITY_FEATURE_SNAPSHOT_SCHEMA_VERSION}`;
export const PRE_RACE_FEATURE_SNAPSHOT_TYPE =
  "pre_race_opportunity_feature_snapshot";

export const FEATURE_SNAPSHOT_REPLAY_STRATEGY =
  "deterministic_id_skip_existing" as const;

const FORBIDDEN_SIDE_EFFECT_TARGETS = [
  "prediction_outputs",
  "opportunity_scores",
  "wager_recommendations",
  "daily_bet_sheets",
  "daily_bet_sheet_entries",
  "provider_ingestion",
  "model_training_runs",
  "value_calculations",
] as const;

export type FeatureSnapshotMaterializationRace = PreRaceFeatureSnapshotRace & {
  status: string | null;
};

export type FeatureSnapshotMaterializationEntry =
  PreRaceFeatureSnapshotEntry & {
    status: string | null;
  };

export type FeatureSnapshotMaterializationInput = {
  races: readonly FeatureSnapshotMaterializationRace[];
  entries: readonly FeatureSnapshotMaterializationEntry[];
  oddsSnapshots: readonly PreRaceOddsSnapshotInput[];
  existingFeatureSnapshotIds?: ReadonlySet<string>;
};

export type FeatureSnapshotInsertRow = {
  id: string;
  race_id: string;
  race_date: string;
  race_entry_id: string;
  provider: string | null;
  feature_set_key: typeof PRE_RACE_FEATURE_SNAPSHOT_SET_KEY;
  feature_set_version: typeof PRE_RACE_FEATURE_SNAPSHOT_SET_VERSION;
  features: FeatureSnapshotEnvelope;
  captured_at: string;
  source_job_run_id: null;
};

export type FeatureSnapshotEnvelope = {
  snapshotType: typeof PRE_RACE_FEATURE_SNAPSHOT_TYPE;
  replaySafety: {
    strategy: typeof FEATURE_SNAPSHOT_REPLAY_STRATEGY;
    deterministicId: string;
    skipExistingBeforeInsert: true;
    schemaUniqueSourceHash: false;
  };
  snapshot: OpportunityFeatureSnapshot;
  builderAudit: PreRaceFeatureSnapshotBuildResult["audit"];
  materialization: {
    generatedBy: "dev_feature_snapshots_materialization";
    writeScope: "dev_only_feature_snapshots";
    allowedWriteTarget: "feature_snapshots";
    prohibitedSideEffectTargets: readonly (typeof FORBIDDEN_SIDE_EFFECT_TARGETS)[number][];
    writesPredictions: false;
    writesOpportunityScores: false;
    writesWagers: false;
    writesProviderIngestion: false;
    writesModelTraining: false;
    productionReady: false;
  };
};

export type FeatureSnapshotMaterializationPlanItem =
  | {
      status: "planned";
      id: string;
      raceId: string;
      raceDate: string;
      raceEntryId: string;
      row: FeatureSnapshotInsertRow;
      blockingReasons: readonly [];
      skippedReason: null;
    }
  | {
      status: "skipped_existing";
      id: string;
      raceId: string;
      raceDate: string;
      raceEntryId: string;
      row: FeatureSnapshotInsertRow;
      blockingReasons: readonly [];
      skippedReason: "already_materialized";
    }
  | {
      status: "blocked";
      id: string;
      raceId: string;
      raceDate: string;
      raceEntryId: string;
      row: null;
      blockingReasons: readonly string[];
      skippedReason: "readiness_blocked";
    };

export type FeatureSnapshotMaterializationSummary = {
  replayStrategy: typeof FEATURE_SNAPSHOT_REPLAY_STRATEGY;
  racesReviewed: number;
  entriesReviewed: number;
  plannedSnapshots: number;
  blockedSnapshots: number;
  skippedExistingSnapshots: number;
};

export type FeatureSnapshotMaterializationPlan = {
  summary: FeatureSnapshotMaterializationSummary;
  items: readonly FeatureSnapshotMaterializationPlanItem[];
};

function parseTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeIso(value: string) {
  const parsed = parseTime(value);
  return parsed === null ? value : new Date(parsed).toISOString();
}

function fallbackCapturedAt(raceDate: string) {
  return `${raceDate}T00:00:00.000Z`;
}

function sourceLineageIds(
  race: FeatureSnapshotMaterializationRace,
  entry: FeatureSnapshotMaterializationEntry,
  oddsSnapshots: readonly PreRaceOddsSnapshotInput[],
) {
  return [
    `race:${race.id}`,
    `race_entry:${entry.id}`,
    ...(entry.horseId ? [`horse:${entry.horseId}`] : []),
    ...oddsSnapshots.map((odds) => `odds_snapshot:${odds.id}`),
  ];
}

function latestEligibleOddsSnapshotAt(
  race: FeatureSnapshotMaterializationRace,
  entry: FeatureSnapshotMaterializationEntry,
  oddsSnapshots: readonly PreRaceOddsSnapshotInput[],
) {
  const cutoff = parseTime(race.scheduledAt);

  if (cutoff === null) {
    return null;
  }

  const latest = oddsSnapshots
    .filter((odds) => {
      const snapshotAt = parseTime(odds.snapshotAt);
      return (
        odds.raceId === race.id &&
        odds.raceDate === race.raceDate &&
        odds.raceEntryId === entry.id &&
        odds.poolType === "win" &&
        snapshotAt !== null &&
        snapshotAt < cutoff
      );
    })
    .sort((a, b) => {
      const aTime = parseTime(a.snapshotAt) ?? Number.NEGATIVE_INFINITY;
      const bTime = parseTime(b.snapshotAt) ?? Number.NEGATIVE_INFINITY;

      if (aTime !== bTime) {
        return bTime - aTime;
      }

      return (b.sequenceNumber ?? 0) - (a.sequenceNumber ?? 0);
    })[0];

  return latest?.snapshotAt ? normalizeIso(latest.snapshotAt) : null;
}

function capturedAtFor(
  race: FeatureSnapshotMaterializationRace,
  entry: FeatureSnapshotMaterializationEntry,
  oddsSnapshots: readonly PreRaceOddsSnapshotInput[],
) {
  return (
    latestEligibleOddsSnapshotAt(race, entry, oddsSnapshots) ??
    (race.scheduledAt ? normalizeIso(race.scheduledAt) : null) ??
    fallbackCapturedAt(race.raceDate)
  );
}

function deterministicUuid(parts: readonly unknown[]) {
  const hash = createHash("sha256")
    .update(JSON.stringify(parts))
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));

  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function materializeSnapshot(
  buildResult: PreRaceFeatureSnapshotBuildResult,
  featureSnapshotId: string,
) {
  const { readiness, ...snapshotInput } = buildResult.snapshot;
  const missingFeatureReasons = readiness.missingFeatureReasons.filter(
    (reason) => reason.key !== "feature_snapshot_reference",
  );

  return buildOpportunityFeatureSnapshot({
    ...snapshotInput,
    lineage: {
      ...snapshotInput.lineage,
      featureSnapshotId,
    },
    missingFeatureReasons,
  });
}

function buildEnvelope(
  snapshot: OpportunityFeatureSnapshot,
  buildResult: PreRaceFeatureSnapshotBuildResult,
  deterministicId: string,
): FeatureSnapshotEnvelope {
  return {
    snapshotType: PRE_RACE_FEATURE_SNAPSHOT_TYPE,
    replaySafety: {
      strategy: FEATURE_SNAPSHOT_REPLAY_STRATEGY,
      deterministicId,
      skipExistingBeforeInsert: true,
      schemaUniqueSourceHash: false,
    },
    snapshot,
    builderAudit: buildResult.audit,
    materialization: {
      generatedBy: "dev_feature_snapshots_materialization",
      writeScope: "dev_only_feature_snapshots",
      allowedWriteTarget: "feature_snapshots",
      prohibitedSideEffectTargets: FORBIDDEN_SIDE_EFFECT_TARGETS,
      writesPredictions: false,
      writesOpportunityScores: false,
      writesWagers: false,
      writesProviderIngestion: false,
      writesModelTraining: false,
      productionReady: false,
    },
  };
}

function buildItem(
  race: FeatureSnapshotMaterializationRace,
  entry: FeatureSnapshotMaterializationEntry,
  oddsSnapshots: readonly PreRaceOddsSnapshotInput[],
  existingFeatureSnapshotIds: ReadonlySet<string>,
): FeatureSnapshotMaterializationPlanItem {
  const capturedAt = capturedAtFor(race, entry, oddsSnapshots);
  const sourceIds = sourceLineageIds(race, entry, oddsSnapshots);
  const buildResult = buildPreRaceOpportunityFeatureSnapshot({
    race,
    entry,
    oddsSnapshots,
    capturedAt,
    sourceLineageIds: sourceIds,
  });
  const id = deterministicUuid([
    PRE_RACE_FEATURE_SNAPSHOT_TYPE,
    PRE_RACE_FEATURE_SNAPSHOT_SET_KEY,
    PRE_RACE_FEATURE_SNAPSHOT_SET_VERSION,
    race.id,
    race.raceDate,
    entry.id,
    capturedAt,
    sourceIds,
    buildResult.audit.usedOddsSnapshotId,
    buildResult.audit.cutoffAt,
  ]);
  const snapshot = materializeSnapshot(buildResult, id);

  if (snapshot.readiness.status === "blocked") {
    return {
      status: "blocked",
      id,
      raceId: race.id,
      raceDate: race.raceDate,
      raceEntryId: entry.id,
      row: null,
      blockingReasons: snapshot.readiness.blockingReasons,
      skippedReason: "readiness_blocked",
    };
  }

  const row: FeatureSnapshotInsertRow = {
    id,
    race_id: race.id,
    race_date: race.raceDate,
    race_entry_id: entry.id,
    provider: race.provider,
    feature_set_key: PRE_RACE_FEATURE_SNAPSHOT_SET_KEY,
    feature_set_version: PRE_RACE_FEATURE_SNAPSHOT_SET_VERSION,
    features: buildEnvelope(snapshot, buildResult, id),
    captured_at: capturedAt,
    source_job_run_id: null,
  };

  if (existingFeatureSnapshotIds.has(id)) {
    return {
      status: "skipped_existing",
      id,
      raceId: race.id,
      raceDate: race.raceDate,
      raceEntryId: entry.id,
      row,
      blockingReasons: [],
      skippedReason: "already_materialized",
    };
  }

  return {
    status: "planned",
    id,
    raceId: race.id,
    raceDate: race.raceDate,
    raceEntryId: entry.id,
    row,
    blockingReasons: [],
    skippedReason: null,
  };
}

function summarize(
  racesReviewed: number,
  entriesReviewed: number,
  items: readonly FeatureSnapshotMaterializationPlanItem[],
): FeatureSnapshotMaterializationSummary {
  return {
    replayStrategy: FEATURE_SNAPSHOT_REPLAY_STRATEGY,
    racesReviewed,
    entriesReviewed,
    plannedSnapshots: items.filter((item) => item.status === "planned").length,
    blockedSnapshots: items.filter((item) => item.status === "blocked").length,
    skippedExistingSnapshots: items.filter(
      (item) => item.status === "skipped_existing",
    ).length,
  };
}

export function buildPreRaceFeatureSnapshotMaterializationPlan(
  input: FeatureSnapshotMaterializationInput,
): FeatureSnapshotMaterializationPlan {
  const entriesByRace = new Map<string, FeatureSnapshotMaterializationEntry[]>();
  const oddsByEntry = new Map<string, PreRaceOddsSnapshotInput[]>();

  for (const entry of input.entries) {
    if (!entry.raceId || !entry.raceDate) {
      continue;
    }

    const key = `${entry.raceId}:${entry.raceDate}`;
    const entries = entriesByRace.get(key) ?? [];
    entries.push(entry);
    entriesByRace.set(key, entries);
  }

  for (const odds of input.oddsSnapshots) {
    if (!odds.raceEntryId) {
      continue;
    }

    const rows = oddsByEntry.get(odds.raceEntryId) ?? [];
    rows.push(odds);
    oddsByEntry.set(odds.raceEntryId, rows);
  }

  const items = input.races.flatMap((race) => {
    const entries = entriesByRace.get(`${race.id}:${race.raceDate}`) ?? [];
    return entries.map((entry) =>
      buildItem(
        race,
        entry,
        oddsByEntry.get(entry.id) ?? [],
        input.existingFeatureSnapshotIds ?? new Set<string>(),
      ),
    );
  });

  return {
    summary: summarize(input.races.length, input.entries.length, items),
    items,
  };
}
