#!/usr/bin/env node
// Patches the freshly-cloned upstream book.toml (see .github/workflows/deploy.yml)
// so the built site loads our narrator toolbar. This runs against the
// upstream repo's *working copy* at build time — it never touches the
// upstream repo itself, and this project doesn't vendor/commit the
// book's content (see README.md and ATTRIBUTION.md for why).
//
// Two changes only:
//   1. Append narrator.css / narrator.bundle.js to [output.html]'s
//      additional-css / additional-js.
//   2. Drop the `aquascope` preprocessor. It renders the upstream book's
//      interactive Rust-ownership diagrams and needs its own backend
//      service; this project only reproduces the book text + quizzes,
//      so we keep the build self-contained rather than half-installing
//      a dependency this project doesn't otherwise support.
//
// Everything else in book.toml (including the `quiz` preprocessor that
// powers the actual quizzes) is left untouched.

import { readFileSync, writeFileSync } from "node:fs";
import { parse, stringify } from "smol-toml";

const bookTomlPath = process.argv[2] ?? "book/book.toml";

const raw = readFileSync(bookTomlPath, "utf8");
const doc = parse(raw);

doc.output ??= {};
doc.output.html ??= {};
const html = doc.output.html;

html["additional-css"] = [...new Set([...(html["additional-css"] ?? []), "narrator.css"])];
html["additional-js"] = [...new Set([...(html["additional-js"] ?? []), "narrator.bundle.js"])];

if (doc.preprocessor?.aquascope) {
  delete doc.preprocessor.aquascope;
  console.log("[patch-book-toml] dropped [preprocessor.aquascope] (not supported by this build)");
}

writeFileSync(bookTomlPath, stringify(doc));
console.log(`[patch-book-toml] patched ${bookTomlPath}`);
