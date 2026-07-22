#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "coverage",
  "node_modules",
  "out",
]);
const testFilePattern = /\.test\.(?:ts|tsx)$/;
const testFiles = [];

function discoverTestFiles(directory) {
  const entries = readdirSync(directory, { withFileTypes: true }).sort(
    (left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        discoverTestFiles(path);
      }
      continue;
    }

    if (entry.isFile() && testFilePattern.test(entry.name)) {
      testFiles.push(relative(repoRoot, path).split(sep).join("/"));
    }
  }
}

discoverTestFiles(repoRoot);
testFiles.sort();

console.log(`Discovered ${testFiles.length} test files.`);

for (const testFile of testFiles) {
  console.log(`- ${testFile}`);
}

if (testFiles.length === 0) {
  console.error("Test discovery found zero *.test.ts or *.test.tsx files.");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [require.resolve("tsx/cli"), "--test", ...testFiles],
  {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(`Unable to start the repository-local test runner: ${result.error.message}`);
  process.exit(1);
}

if (result.signal) {
  console.error(`Test runner exited with signal ${result.signal}.`);
  process.exit(1);
}

process.exit(result.status ?? 1);
