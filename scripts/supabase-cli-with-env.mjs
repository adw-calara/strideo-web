#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const envFiles = [".env", ".env.local", ".env.development.local"];
const env = { ...process.env };
const args = process.argv.slice(2);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const supabaseExecutable = resolve(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "supabase.cmd" : "supabase",
);

function parseEnvLine(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const assignment = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);

  if (!assignment) {
    return null;
  }

  const [, key, rawValue] = assignment;
  let value = rawValue.trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

for (const file of envFiles) {
  const path = resolve(process.cwd(), file);

  if (!existsSync(path)) {
    continue;
  }

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const parsed = parseEnvLine(line);

    if (!parsed) {
      continue;
    }

    const [key, value] = parsed;

    if (!env[key]) {
      env[key] = value;
    }
  }
}

if (args.length === 0) {
  console.error("Usage: node scripts/supabase-cli-with-env.mjs <supabase args...>");
  process.exit(1);
}

const requiresRemoteDbPassword =
  args[0] === "db" ||
  (args[0] === "migration" && args[1] === "list" && args.includes("--linked"));

if (requiresRemoteDbPassword && !env.SUPABASE_DB_PASSWORD) {
  console.error(
    [
      "SUPABASE_DB_PASSWORD is required for linked Supabase database commands.",
      "Add it to your local, gitignored .env.local file or export it in the shell.",
      "The value should be the Dev project database password for strideo-dev / ntxtakbggtljjbalgris.",
    ].join("\n"),
  );
  process.exit(1);
}

if (!existsSync(supabaseExecutable)) {
  console.error(
    "Repository-local Supabase CLI is unavailable. Run npm ci before using linked database scripts.",
  );
  process.exit(1);
}

const child = spawn(supabaseExecutable, args, {
  env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Unable to start the repository-local Supabase CLI: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`supabase exited with signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
