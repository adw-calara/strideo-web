const DEFAULT_AUTH_REDIRECT = "/protected";

export function normalizeAuthRedirect(
  input: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
) {
  if (!isSafeRelativeRedirect(fallback)) {
    throw new Error("Auth redirect fallback must be a safe relative path.");
  }

  if (!input || !isSafeRelativeRedirect(input)) {
    return fallback;
  }

  return input;
}

function isSafeRelativeRedirect(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return false;
  }

  if (value.includes("\\")) {
    return false;
  }

  try {
    const parsed = new URL(value, "http://strideo.local");
    return parsed.origin === "http://strideo.local";
  } catch {
    return false;
  }
}
