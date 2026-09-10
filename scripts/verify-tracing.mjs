#!/usr/bin/env node
/**
 * Compiles every Tracing quiz question's program with the real, local
 * rustc and records what actually happens — not what upstream's .toml
 * claims happens. Upstream's `doesCompile`/`lineNumber`/`stdout` fields
 * are authored by hand alongside the prose; this is a mechanical
 * cross-check against ground truth before we grade a reader on them.
 *
 * Writes src/data/quiz-verification.json, keyed by question id — a
 * *committed* sidecar, unlike src/data/quizzes/*.json (gitignored,
 * regenerated fresh by fetch-book.mjs every run; see its header comment).
 * Question ids are upstream-authored UUIDs embedded in the source .toml,
 * so they stay stable across a re-fetch unless upstream edits that exact
 * question — at which point this file is stale and a rerun is needed.
 * RecallQuiz.astro merges this in at render time, matched by id.
 *
 * Requires `npm run fetch-book` to have populated src/data/quizzes/ in
 * this checkout, and a local `rustc` on PATH (edition 2024, matching the
 * book's own listings — see .book-src/listings/**\/Cargo.toml). Not part
 * of the Vercel build: run by hand and commit the result, same shape as
 * scripts/narrate.mjs.
 *
 * Usage: node scripts/verify-tracing.mjs
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const QUIZ_DIR = "src/data/quizzes";
const OUT_FILE = "src/data/quiz-verification.json";
const EDITION = "2024";

if (!fs.existsSync(QUIZ_DIR)) {
  console.error(`[verify-tracing] ${QUIZ_DIR} missing — run \`npm run fetch-book\` first.`);
  process.exit(1);
}

const questions = [];
for (const file of fs.readdirSync(QUIZ_DIR)) {
  if (!file.endsWith(".json")) continue;
  const all = JSON.parse(fs.readFileSync(path.join(QUIZ_DIR, file), "utf8"));
  for (const q of all) {
    if (q.type === "Tracing") questions.push({ file, q });
  }
}

console.log(`[verify-tracing] ${questions.length} Tracing question(s) across ${QUIZ_DIR}`);

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-tracing-"));
const results = {};
const mismatches = [];
let compileMismatches = 0;
let lineMismatches = 0;
let stdoutMismatches = 0;

/** rustc's primary error line, from a span like " --> program.rs:4:3". */
function primaryErrorLine(stderr) {
  const match = stderr.match(/-->\s*program\.rs:(\d+):\d+/);
  return match ? Number(match[1]) : null;
}

/** First `error[...]: message` or `error: message` line, for a short label. */
function primaryErrorMessage(stderr) {
  const match = stderr.match(/^(error(?:\[[^\]]+\])?):\s*(.+)$/m);
  return match ? `${match[1]}: ${match[2]}` : stderr.trim().split("\n")[0] ?? "";
}

for (const [i, { file, q }] of questions.entries()) {
  // Relative filenames, run with cwd: workDir — rustc's own error spans
  // echo back whatever path it was invoked with ("--> program.rs:4:3"),
  // and primaryErrorLine()'s regex is anchored to that literal name. Pass
  // an absolute path instead and every span reads "--> /tmp/.../program.rs:
  // 4:3", the regex never matches, and every doesCompile:false result
  // silently gets `line: null` — caught by code review, not by this
  // script's own mismatch check (which skips the comparison whenever the
  // parsed line is null, so it can't flag its own parse failure).
  const src = "program.rs";
  const bin = "program.bin";
  fs.writeFileSync(path.join(workDir, src), q.prompt.program);
  try {
    fs.unlinkSync(path.join(workDir, bin));
  } catch {
    /* didn't exist */
  }

  let compiled = true;
  let stderr = "";
  try {
    execFileSync("rustc", ["--edition", EDITION, "-o", bin, src], {
      cwd: workDir,
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (err) {
    compiled = false;
    stderr = err.stderr?.toString() ?? "";
  }

  const expectedCompile = q.answer.doesCompile;
  if (compiled !== expectedCompile) {
    compileMismatches++;
    mismatches.push(
      `${file} [${q.id}]: upstream says doesCompile=${expectedCompile}, rustc says ${compiled}`,
    );
  }

  if (compiled) {
    let stdout = "";
    try {
      // Needs the absolute path to actually exec (a bare relative name only
      // resolves via PATH, not cwd) — unlike the rustc invocation above,
      // execution has no reason to prefer the relative form.
      stdout = execFileSync(path.join(workDir, bin), [], { cwd: workDir }).toString();
    } catch (err) {
      // Compiled but panicked/exited non-zero — still capture what it printed.
      stdout = err.stdout?.toString() ?? "";
    }
    results[q.id] = { doesCompile: true, stdout };
    // Upstream is inconsistent about a trailing newline on the last printed
    // line (mdbook-quiz's own authoring didn't normalize it either) — so
    // the mismatch check ignores it, while `stdout` above keeps rustc's
    // actual raw output for display.
    const trimTrailingNewline = (s) => s.replace(/\n$/, "");
    if (
      expectedCompile &&
      q.answer.stdout !== undefined &&
      trimTrailingNewline(q.answer.stdout) !== trimTrailingNewline(stdout)
    ) {
      stdoutMismatches++;
      mismatches.push(
        `${file} [${q.id}]: upstream stdout ${JSON.stringify(q.answer.stdout)} != rustc-run ${JSON.stringify(stdout)}`,
      );
    }
  } else {
    const line = primaryErrorLine(stderr);
    const lineDisagrees =
      expectedCompile === false && q.answer.lineNumber !== undefined && line !== null && line !== q.answer.lineNumber;
    results[q.id] = { doesCompile: false, line, message: primaryErrorMessage(stderr) };
    // Persisted on the entry itself, not just logged — RecallQuiz.astro
    // prefers upstream's lineNumber for exactly this reason (rustc's
    // *primary* diagnostic span isn't always the pedagogically-intended
    // line; see its merge logic), but that preference is a judgment call
    // made by hand for the disagreements found so far, not something this
    // script itself validates. Console output alone doesn't survive past
    // this one run — committing the flag does, so a future disagreement
    // this script wasn't around to explain out loud is still visible to
    // whoever next reads quiz-verification.json, instead of silently
    // trusting upstream's line forever.
    if (lineDisagrees) {
      results[q.id].lineDisagreesWithUpstream = true;
      lineMismatches++;
      mismatches.push(
        `${file} [${q.id}]: upstream lineNumber=${q.answer.lineNumber}, rustc points at line ${line}`,
      );
    }
  }

  if ((i + 1) % 20 === 0 || i === questions.length - 1) {
    console.log(`  [${i + 1}/${questions.length}] ${file} ${q.id}`);
  }
}

fs.rmSync(workDir, { recursive: true, force: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2) + "\n");

console.log(`\n[verify-tracing] wrote ${Object.keys(results).length} entries to ${OUT_FILE}`);
console.log(
  `[verify-tracing] mismatches — doesCompile: ${compileMismatches}, lineNumber: ${lineMismatches}, stdout: ${stdoutMismatches}`,
);
if (mismatches.length) {
  console.log(`\n[verify-tracing] details:`);
  for (const m of mismatches) console.log(`  ! ${m}`);
}
