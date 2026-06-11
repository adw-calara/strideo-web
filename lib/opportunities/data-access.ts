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

function raiseOpportunityFeedError(operation: string) {
  throw new Error(`Opportunity feed data is unavailable during ${operation}.`);
}

function mapSubject(row: RawOpportunitySubjectRow): OpportunityFeedSubject {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    raceDate: row.race_date,
    raceEntryId: row.race_entry_id,
    subjectRole: row.subject_role,
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

  const subjectsByOpportunityId = groupByOpportunityId(
    (subjectResult.data ?? []).map(mapSubject),
  );
  const scoresByOpportunityId = firstByOpportunityId(
    (scoreResult.data ?? []).map(mapScore),
  );
  const explanationsByOpportunityId = firstByOpportunityId(
    (explanationResult.data ?? []).map(mapExplanation),
  );
  const feedItems = opportunities.map((opportunity) =>
    mapOpportunity(
      opportunity,
      subjectsByOpportunityId,
      scoresByOpportunityId,
      explanationsByOpportunityId,
    ),
  );
  const summary = summarizeOpportunityFeed(feedItems);

  return {
    status: "loaded",
    opportunities: feedItems,
    summary,
    message: `${summary.opportunityCount} Opportunity signal${
      summary.opportunityCount === 1 ? "" : "s"
    } loaded.`,
  };
}
