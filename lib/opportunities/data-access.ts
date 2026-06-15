import "server-only";

import { createClient } from "@/lib/supabase/server";

export const EMPTY_OPPORTUNITY_FEED_MESSAGE =
  "No published Opportunities are visible yet.";

export type OpportunityFeedDataStatus = "loaded" | "empty";

export type OpportunityFeedState =
  | "published"
  | "closed"
  | "resulted"
  | "verified";

export type OpportunityFeedSubject = {
  id: string;
  opportunityId: string;
  raceDate: string;
  raceEntryId: string;
  subjectRole: string;
  programNumber: string | null;
  horseName: string | null;
  raceNumber: number | null;
  raceName: string | null;
  trackName: string | null;
  ordinal: number | null;
  weight: number | null;
  createdAt: string;
};

export type OpportunityFeedScore = {
  id: string;
  opportunityId: string;
  raceDate: string;
  score: number | null;
  confidence: number | null;
  edge: number | null;
  fairValue: number | null;
  scoringVersion: string | null;
  scoredAt: string;
  createdAt: string;
};

export type OpportunityFeedExplanation = {
  id: string;
  opportunityId: string;
  raceDate: string;
  explanationVersion: string;
  headline: string | null;
  summary: string | null;
  generatedAt: string;
  createdAt: string;
};

export type OpportunityTrackingState = {
  isAvailable: boolean;
  isTracked: boolean;
  workflowState: string | null;
  trackedAt: string | null;
  updatedAt: string | null;
};

export type OpportunityFeedItem = {
  id: string;
  raceDate: string;
  raceId: string;
  opportunityType: string;
  state: OpportunityFeedState;
  currentScore: number | null;
  currentConfidence: number | null;
  currentEdge: number | null;
  firstDetectedAt: string;
  publishedAt: string | null;
  closedAt: string | null;
  resultedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subjects: OpportunityFeedSubject[];
  latestScore: OpportunityFeedScore | null;
  latestExplanation: OpportunityFeedExplanation | null;
};

export type OpportunityDetailItem = OpportunityFeedItem & {
  scoreHistory: OpportunityFeedScore[];
  explanationHistory: OpportunityFeedExplanation[];
  trackingState: OpportunityTrackingState;
};

export type OpportunityFeedSummary = {
  opportunityCount: number;
  subjectCount: number;
  scoreCount: number;
  explanationCount: number;
};

export type OpportunityFeedResult = {
  status: OpportunityFeedDataStatus;
  opportunities: OpportunityFeedItem[];
  summary: OpportunityFeedSummary;
  message: string;
};

export type OpportunityDetailResult = {
  status: OpportunityFeedDataStatus;
  opportunity: OpportunityDetailItem | null;
  message: string;
};

type RawOpportunityRow = {
  id: string;
  race_date: string;
  race_id: string;
  opportunity_type: string;
  state: OpportunityFeedState;
  current_score: number | null;
  current_confidence: number | null;
  current_edge: number | null;
  first_detected_at: string;
  published_at: string | null;
  closed_at: string | null;
  resulted_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

type RawOpportunitySubjectRow = {
  id: string;
  opportunity_id: string;
  race_date: string;
  race_entry_id: string;
  subject_role: string;
  ordinal: number | null;
  weight: number | null;
  created_at: string;
};

type RawOpportunityScoreRow = {
  id: string;
  opportunity_id: string;
  race_date: string;
  score: number | null;
  confidence: number | null;
  edge: number | null;
  fair_value: number | null;
  scoring_version: string | null;
  scored_at: string;
  created_at: string;
};

type RawOpportunityExplanationRow = {
  id: string;
  opportunity_id: string;
  race_date: string;
  explanation_version: string;
  headline: string | null;
  summary: string | null;
  generated_at: string;
  created_at: string;
};

type RawRaceEntryContextRow = {
  id: string;
  race_date: string;
  race_id: string;
  program_number: string | null;
  horse_id: string | null;
};

type RawHorseContextRow = {
  id: string;
  name: string;
};

type RawRaceContextRow = {
  id: string;
  race_date: string;
  race_number: number;
  name: string | null;
  track_id: string;
};

type RawTrackContextRow = {
  id: string;
  name: string;
};

type RawOpportunityTrackingRow = {
  id: string;
  opportunity_id: string;
  opportunity_race_date: string;
  workflow_state: string;
  created_at: string;
  updated_at: string;
};

type SubjectContext = {
  programNumber: string | null;
  horseName: string | null;
  raceNumber: number | null;
  raceName: string | null;
  trackName: string | null;
};

const opportunitySelect = `
  id,
  race_date,
  race_id,
  opportunity_type,
  state,
  current_score,
  current_confidence,
  current_edge,
  first_detected_at,
  published_at,
  closed_at,
  resulted_at,
  verified_at,
  created_at,
  updated_at
`;

const opportunitySubjectSelect = `
  id,
  opportunity_id,
  race_date,
  race_entry_id,
  subject_role,
  ordinal,
  weight,
  created_at
`;

const opportunityScoreSelect = `
  id,
  opportunity_id,
  race_date,
  score,
  confidence,
  edge,
  fair_value,
  scoring_version,
  scored_at,
  created_at
`;

const opportunityExplanationSelect = `
  id,
  opportunity_id,
  race_date,
  explanation_version,
  headline,
  summary,
  generated_at,
  created_at
`;

const raceEntryContextSelect = `
  id,
  race_date,
  race_id,
  program_number,
  horse_id
`;

const horseContextSelect = `
  id,
  name
`;

const raceContextSelect = `
  id,
  race_date,
  race_number,
  name,
  track_id
`;

const trackContextSelect = `
  id,
  name
`;

const opportunityTrackingSelect = `
  id,
  opportunity_id,
  opportunity_race_date,
  workflow_state,
  created_at,
  updated_at
`;

function raiseOpportunityFeedError(operation: string) {
  throw new Error(`Opportunity feed data is unavailable during ${operation}.`);
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function mapById<T extends { id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T>>((byId, row) => {
    byId[row.id] = row;
    return byId;
  }, {});
}

function mapSubject(
  row: RawOpportunitySubjectRow,
  contextByRaceEntryId: Record<string, SubjectContext>,
): OpportunityFeedSubject {
  const context = contextByRaceEntryId[row.race_entry_id];

  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    raceDate: row.race_date,
    raceEntryId: row.race_entry_id,
    subjectRole: row.subject_role,
    programNumber: context?.programNumber ?? null,
    horseName: context?.horseName ?? null,
    raceNumber: context?.raceNumber ?? null,
    raceName: context?.raceName ?? null,
    trackName: context?.trackName ?? null,
    ordinal: row.ordinal,
    weight: row.weight,
    createdAt: row.created_at,
  };
}

function mapScore(row: RawOpportunityScoreRow): OpportunityFeedScore {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    raceDate: row.race_date,
    score: row.score,
    confidence: row.confidence,
    edge: row.edge,
    fairValue: row.fair_value,
    scoringVersion: row.scoring_version,
    scoredAt: row.scored_at,
    createdAt: row.created_at,
  };
}

function mapExplanation(
  row: RawOpportunityExplanationRow,
): OpportunityFeedExplanation {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    raceDate: row.race_date,
    explanationVersion: row.explanation_version,
    headline: row.headline,
    summary: row.summary,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
  };
}

function mapTrackingState(
  row: RawOpportunityTrackingRow | null,
): OpportunityTrackingState {
  return {
    isAvailable: true,
    isTracked: Boolean(row),
    workflowState: row?.workflow_state ?? null,
    trackedAt: row?.created_at ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

function groupByOpportunityId<T extends { opportunityId: string }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((groups, row) => {
    groups[row.opportunityId] = groups[row.opportunityId] ?? [];
    groups[row.opportunityId].push(row);
    return groups;
  }, {});
}

function firstByOpportunityId<T extends { opportunityId: string }>(rows: T[]) {
  return rows.reduce<Record<string, T>>((byOpportunityId, row) => {
    byOpportunityId[row.opportunityId] =
      byOpportunityId[row.opportunityId] ?? row;
    return byOpportunityId;
  }, {});
}

function mapOpportunity(
  row: RawOpportunityRow,
  subjectsByOpportunityId: Record<string, OpportunityFeedSubject[]>,
  scoresByOpportunityId: Record<string, OpportunityFeedScore>,
  explanationsByOpportunityId: Record<string, OpportunityFeedExplanation>,
): OpportunityFeedItem {
  return {
    id: row.id,
    raceDate: row.race_date,
    raceId: row.race_id,
    opportunityType: row.opportunity_type,
    state: row.state,
    currentScore: row.current_score,
    currentConfidence: row.current_confidence,
    currentEdge: row.current_edge,
    firstDetectedAt: row.first_detected_at,
    publishedAt: row.published_at,
    closedAt: row.closed_at,
    resultedAt: row.resulted_at,
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subjects: subjectsByOpportunityId[row.id] ?? [],
    latestScore: scoresByOpportunityId[row.id] ?? null,
    latestExplanation: explanationsByOpportunityId[row.id] ?? null,
  };
}

function summarizeOpportunityFeed(
  opportunities: OpportunityFeedItem[],
): OpportunityFeedSummary {
  return opportunities.reduce<OpportunityFeedSummary>(
    (summary, opportunity) => {
      summary.opportunityCount += 1;
      summary.subjectCount += opportunity.subjects.length;

      if (opportunity.latestScore) {
        summary.scoreCount += 1;
      }

      if (opportunity.latestExplanation) {
        summary.explanationCount += 1;
      }

      return summary;
    },
    {
      opportunityCount: 0,
      subjectCount: 0,
      scoreCount: 0,
      explanationCount: 0,
    },
  );
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function hydrateOpportunityRows(
  supabase: SupabaseServerClient,
  opportunities: RawOpportunityRow[],
) {
  const opportunityIds = opportunities.map((opportunity) => opportunity.id);
  const [subjectResult, scoreResult, explanationResult] = await Promise.all([
    supabase
      .from("opportunity_subjects")
      .select(opportunitySubjectSelect)
      .in("opportunity_id", opportunityIds)
      .order("ordinal", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true })
      .returns<RawOpportunitySubjectRow[]>(),
    supabase
      .from("opportunity_scores")
      .select(opportunityScoreSelect)
      .in("opportunity_id", opportunityIds)
      .order("scored_at", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<RawOpportunityScoreRow[]>(),
    supabase
      .from("opportunity_explanations")
      .select(opportunityExplanationSelect)
      .in("opportunity_id", opportunityIds)
      .order("generated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<RawOpportunityExplanationRow[]>(),
  ]);

  if (subjectResult.error) {
    raiseOpportunityFeedError("subject list");
  }

  if (scoreResult.error) {
    raiseOpportunityFeedError("score list");
  }

  if (explanationResult.error) {
    raiseOpportunityFeedError("explanation list");
  }

  const subjectRows = subjectResult.data ?? [];
  const raceEntryIds = uniqueStrings(
    subjectRows.map((subject) => subject.race_entry_id),
  );
  let contextByRaceEntryId: Record<string, SubjectContext> = {};

  if (raceEntryIds.length > 0) {
    const { data: raceEntryRows, error: raceEntryError } = await supabase
      .from("race_entries")
      .select(raceEntryContextSelect)
      .in("id", raceEntryIds)
      .returns<RawRaceEntryContextRow[]>();

    if (raceEntryError) {
      raiseOpportunityFeedError("race entry context");
    }

    const raceEntries = raceEntryRows ?? [];
    const horseIds = uniqueStrings(
      raceEntries.map((raceEntry) => raceEntry.horse_id),
    );
    const raceIds = uniqueStrings(
      raceEntries.map((raceEntry) => raceEntry.race_id),
    );
    const [horseResult, raceResult] = await Promise.all([
      horseIds.length > 0
        ? supabase
            .from("horses")
            .select(horseContextSelect)
            .in("id", horseIds)
            .returns<RawHorseContextRow[]>()
        : Promise.resolve({ data: [], error: null }),
      raceIds.length > 0
        ? supabase
            .from("races")
            .select(raceContextSelect)
            .in("id", raceIds)
            .returns<RawRaceContextRow[]>()
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (horseResult.error) {
      raiseOpportunityFeedError("horse context");
    }

    if (raceResult.error) {
      raiseOpportunityFeedError("race context");
    }

    const races = raceResult.data ?? [];
    const trackIds = uniqueStrings(races.map((race) => race.track_id));
    const trackResult =
      trackIds.length > 0
        ? await supabase
            .from("tracks")
            .select(trackContextSelect)
            .in("id", trackIds)
            .returns<RawTrackContextRow[]>()
        : { data: [], error: null };

    if (trackResult.error) {
      raiseOpportunityFeedError("track context");
    }

    const horsesById = mapById(horseResult.data ?? []);
    const racesById = mapById(races);
    const tracksById = mapById(trackResult.data ?? []);

    contextByRaceEntryId = raceEntries.reduce<Record<string, SubjectContext>>(
      (context, raceEntry) => {
        const horse = raceEntry.horse_id
          ? horsesById[raceEntry.horse_id]
          : null;
        const race = racesById[raceEntry.race_id];
        const track = race ? tracksById[race.track_id] : null;

        context[raceEntry.id] = {
          programNumber: raceEntry.program_number,
          horseName: horse?.name ?? null,
          raceNumber: race?.race_number ?? null,
          raceName: race?.name ?? null,
          trackName: track?.name ?? null,
        };

        return context;
      },
      {},
    );
  }

  const scoreHistory = (scoreResult.data ?? []).map(mapScore);
  const explanationHistory = (explanationResult.data ?? []).map(mapExplanation);
  const subjectsByOpportunityId = groupByOpportunityId(
    subjectRows.map((subject) => mapSubject(subject, contextByRaceEntryId)),
  );
  const scoresByOpportunityId = firstByOpportunityId(scoreHistory);
  const explanationsByOpportunityId = firstByOpportunityId(explanationHistory);
  const items = opportunities.map((opportunity) =>
    mapOpportunity(
      opportunity,
      subjectsByOpportunityId,
      scoresByOpportunityId,
      explanationsByOpportunityId,
    ),
  );

  return {
    items,
    summary: summarizeOpportunityFeed(items),
    scoreHistoryByOpportunityId: groupByOpportunityId(scoreHistory),
    explanationHistoryByOpportunityId:
      groupByOpportunityId(explanationHistory),
  };
}

async function readOpportunityTrackingState(
  supabase: SupabaseServerClient,
  opportunityId: string,
  raceDate: string,
) {
  const { data, error } = await supabase
    .from("watchlist_items")
    .select(opportunityTrackingSelect)
    .eq("opportunity_id", opportunityId)
    .eq("opportunity_race_date", raceDate)
    .is("deleted_at", null)
    .maybeSingle<RawOpportunityTrackingRow>();

  if (error) {
    return {
      isAvailable: false,
      isTracked: false,
      workflowState: null,
      trackedAt: null,
      updatedAt: null,
    };
  }

  return mapTrackingState(data);
}

export async function listOpportunityFeed(): Promise<OpportunityFeedResult> {
  const supabase = await createClient();
  const { data: opportunityRows, error: opportunityError } = await supabase
    .from("opportunities")
    .select(opportunitySelect)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .in("state", ["published", "closed", "resulted", "verified"])
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("first_detected_at", { ascending: false })
    .limit(50)
    .returns<RawOpportunityRow[]>();

  if (opportunityError) {
    raiseOpportunityFeedError("Opportunity list");
  }

  const opportunities = opportunityRows ?? [];

  if (opportunities.length === 0) {
    return {
      status: "empty",
      opportunities: [],
      summary: {
        opportunityCount: 0,
        subjectCount: 0,
        scoreCount: 0,
        explanationCount: 0,
      },
      message: EMPTY_OPPORTUNITY_FEED_MESSAGE,
    };
  }

  const { items, summary } = await hydrateOpportunityRows(
    supabase,
    opportunities,
  );

  return {
    status: "loaded",
    opportunities: items,
    summary,
    message: `${summary.opportunityCount} Opportunity signal${
      summary.opportunityCount === 1 ? "" : "s"
    } loaded.`,
  };
}

export async function getOpportunityDetail(
  opportunityId: string,
): Promise<OpportunityDetailResult> {
  const supabase = await createClient();
  const { data: opportunity, error } = await supabase
    .from("opportunities")
    .select(opportunitySelect)
    .eq("id", opportunityId)
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .in("state", ["published", "closed", "resulted", "verified"])
    .maybeSingle<RawOpportunityRow>();

  if (error) {
    raiseOpportunityFeedError("Opportunity detail");
  }

  if (!opportunity) {
    return {
      status: "empty",
      opportunity: null,
      message: "This Opportunity is not visible in the protected feed.",
    };
  }

  const hydrated = await hydrateOpportunityRows(supabase, [opportunity]);
  const item = hydrated.items[0];

  if (!item) {
    return {
      status: "empty",
      opportunity: null,
      message: "This Opportunity is not visible in the protected feed.",
    };
  }

  return {
    status: "loaded",
    opportunity: {
      ...item,
      scoreHistory: hydrated.scoreHistoryByOpportunityId[item.id] ?? [],
      explanationHistory:
        hydrated.explanationHistoryByOpportunityId[item.id] ?? [],
      trackingState: await readOpportunityTrackingState(
        supabase,
        item.id,
        item.raceDate,
      ),
    },
    message: "Opportunity detail loaded.",
  };
}
