export type RacingFormReadErrorCategory =
  | "permission_or_api_exposure"
  | "relation_missing"
  | "query_construction"
  | "unexpected_response"
  | "unknown";

export type RacingFormReadErrorLike = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

export type RacingFormReadFailureInput = {
  error?: RacingFormReadErrorLike | null;
  status?: number | null;
  statusText?: string | null;
};

export type RacingFormReadFailureDiagnostic = {
  category: RacingFormReadErrorCategory;
  httpStatus?: number;
  message: string;
};

function isMissingRelation(error: RacingFormReadErrorLike) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /relation .* does not exist/i.test(error.message ?? "") ||
    /could not find .* table/i.test(error.message ?? "")
  );
}

function isQueryConstructionError(status?: number | null) {
  return typeof status === "number" && status >= 400 && status < 500 && status !== 401 && status !== 403 && status !== 404;
}

function messageParts(input: RacingFormReadFailureInput) {
  return [
    input.error?.message,
    input.error?.code ? `code=${input.error.code}` : null,
    input.status ? `status=${input.status}` : null,
    input.statusText ? `statusText=${input.statusText}` : null,
    input.error?.details ? `details=${input.error.details}` : null,
    input.error?.hint ? `hint=${input.error.hint}` : null,
  ].filter((part): part is string => Boolean(part));
}

export function classifyRacingFormReadFailure(
  input: RacingFormReadFailureInput,
): RacingFormReadFailureDiagnostic {
  const error = input.error ?? {};
  const status = input.status ?? undefined;
  const parts = messageParts(input);
  let category: RacingFormReadErrorCategory = "unknown";

  if (status === 401 || status === 403) {
    category = "permission_or_api_exposure";
  } else if (isMissingRelation(error)) {
    category = "relation_missing";
  } else if (isQueryConstructionError(status)) {
    category = "query_construction";
  } else if (!input.error && status) {
    category = "unexpected_response";
  }

  return {
    category,
    httpStatus: status,
    message: parts.join("; ") || "Unknown read error returned by Supabase client.",
  };
}
