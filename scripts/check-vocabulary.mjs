#!/usr/bin/env node
// Gate: an exercise for chapter N must not use a Rust token/concept that
// isn't legal until chapter M > N (per exercises/vocabulary.json). Keeps
// the "no knowledge beyond this chapter" progression mechanical instead
// of relying on re-reading every exercise by eye whenever one is added.
//
// Checks the *solution* file (src/bin/solution.rs), not the starter —
// the starter is allowed and expected to be incomplete/non-compiling.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const vocab = JSON.parse(readFileSync("exercises/vocabulary.json", "utf8")).tokens;

const exerciseDirs = readdirSync("exercises", { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

let failed = false;

for (const dir of exerciseDirs) {
  const match = dir.match(/^ch(\d+)-/);
  if (!match) continue;
  const chapterNum = Number(match[1]);
  const solutionPath = join("exercises", dir, "src", "bin", "solution.rs");
  if (!existsSync(solutionPath)) continue;
  const code = readFileSync(solutionPath, "utf8");

  for (const [token, firstLegalChapter] of Object.entries(vocab)) {
    if (firstLegalChapter <= chapterNum) continue;
    // whole-token match, not a substring hit inside an unrelated identifier
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`);
    if (re.test(code)) {
      console.error(
        `[check-vocabulary] ${solutionPath}: uses "${token}" (chapter ${firstLegalChapter}) but this exercise is chapter ${chapterNum}`
      );
      failed = true;
    }
  }
}

if (failed) {
  console.error("\n[check-vocabulary] FAILED — an exercise reaches ahead of its chapter.");
  process.exit(1);
}
console.log(`[check-vocabulary] OK — checked ${exerciseDirs.length} exercise dirs.`);
