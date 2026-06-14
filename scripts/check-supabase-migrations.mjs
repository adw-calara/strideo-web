import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const migrationFilePattern = /^(\d{14})_([a-z0-9]+(?:_[a-z0-9]+)*)\.sql$/;
const legacyFilePattern = /^\d{4}_/;
const errors = [];
const seenVersions = new Map();

function isValidTimestamp(version) {
  const year = Number(version.slice(0, 4));
  const month = Number(version.slice(4, 6));
  const day = Number(version.slice(6, 8));
  const hour = Number(version.slice(8, 10));
  const minute = Number(version.slice(10, 12));
  const second = Number(version.slice(12, 14));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

function hasTransactionWrapper(sql) {
  const withoutComments = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .trim()
    .toLowerCase();

  return /^begin\s*;/.test(withoutComments) && /commit\s*;\s*$/.test(withoutComments);
}

const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of migrationFiles) {
  const match = migrationFilePattern.exec(file);

  if (!match) {
    const hint = legacyFilePattern.test(file)
      ? "Use `supabase migration new <snake_case_name>` instead of legacy numeric prefixes."
      : "Expected `YYYYMMDDHHMMSS_snake_case_name.sql`.";
    errors.push(`${file}: invalid migration filename. ${hint}`);
    continue;
  }

  const [, version] = match;
  const duplicate = seenVersions.get(version);

  if (duplicate) {
    errors.push(`${file}: duplicate timestamp version also used by ${duplicate}.`);
  } else {
    seenVersions.set(version, file);
  }

  if (!isValidTimestamp(version)) {
    errors.push(`${file}: timestamp prefix is not a valid UTC date/time.`);
  }

  const sql = readFileSync(join(migrationsDir, file), "utf8");

  if (!hasTransactionWrapper(sql)) {
    errors.push(`${file}: expected migration SQL to start with begin; and end with commit;.`);
  }
}

if (migrationFiles.length === 0) {
  errors.push("No SQL migration files found in supabase/migrations.");
}

if (errors.length > 0) {
  console.error("Supabase migration check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Supabase migration check passed for ${migrationFiles.length} files.`);
