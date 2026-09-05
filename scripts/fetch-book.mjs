#!/usr/bin/env node
// Clones the Brown CS "quizzed" edition of The Rust Programming Language at
// build/dev time and transforms it into Starlight content. This project
// does not vendor or retype the book: every run starts from a fresh clone,
// so upstream fixes/updates show up here automatically (see the weekly
// cron in .github/workflows/deploy.yml). See ATTRIBUTION.md.
//
// Output (all gitignored, regenerated every run):
//   src/content/docs/book/<NN-slug>.md   one Starlight page per chapter
//   src/content/quizzes/<NN-slug>.json   that chapter's quiz questions, as
//                                        structured data for RecallQuiz.astro
//   src/generated/sidebar.json           Starlight sidebar groups, in the
//                                        book's own SUMMARY.md order
//
// What gets stripped, and why:
//   - {{#quiz path.toml}} directives: mdbook-quiz is a Rust preprocessor
//     that only runs inside `mdbook build`. We can't shell out to it from
//     Astro, so instead we parse the referenced .toml ourselves (it's
//     just structured question data) and hand it to our own RecallQuiz
//     component, injected once per page by src/components/NarratorPageFrame.astro.
//   - {{#include path}} directives: mdbook-only file-transclusion syntax.
//     Rare in this book; we inline the include verbatim if the target is
//     a plain file, and leave a visible TODO comment if we can't resolve it
//     rather than silently dropping content.
//   - aquascope code annotations (`#![...]`-driven interactive diagrams):
//     out of scope, same as the old mdbook build — see README.md "Scope".

import { execSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readdirSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { parse as parseToml } from "smol-toml";

const REPO_URL = "https://github.com/cognitive-engineering-lab/rust-book.git";
const CLONE_DIR = ".book-src";
const OUT_DOCS = "src/content/docs/book";
const OUT_QUIZ = "src/data/quizzes";
const OUT_GEN = "src/generated";

function clean(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

console.log(`[fetch-book] cloning ${REPO_URL} ...`);
rmSync(CLONE_DIR, { recursive: true, force: true });
execSync(`git clone --depth 1 ${REPO_URL} ${CLONE_DIR}`, { stdio: "inherit" });
const bookCommit = execSync(`git -C ${CLONE_DIR} rev-parse HEAD`).toString().trim();
console.log(`[fetch-book] upstream commit: ${bookCommit}`);

clean(OUT_DOCS);
clean(OUT_QUIZ);
mkdirSync(OUT_GEN, { recursive: true });

const srcDir = join(CLONE_DIR, "src");
const summaryPath = join(srcDir, "SUMMARY.md");
const summary = readFileSync(summaryPath, "utf8");

// --- Parse SUMMARY.md ----------------------------------------------------
// mdbook's SUMMARY.md is a nested markdown list:
//   # Some Section Heading
//   - [Chapter Title](relative/path.md)
//     - [Sub-chapter](relative/path.md)
// We only need enough of it to (a) get chapter order, (b) group chapters
// under their section heading for the sidebar, (c) title each page.
const lines = summary.split("\n");
const sections = [];
let currentSection = null;
let chapterIndex = 0;

for (const line of lines) {
  const heading = line.match(/^#\s+(.+)/);
  const item = line.match(/^(\s*)-\s+\[(.+?)\]\((.+?)\)/);
  if (heading) {
    currentSection = { label: heading[1].trim(), items: [] };
    sections.push(currentSection);
    continue;
  }
  if (item && currentSection) {
    const [, indent, title, relPath] = item;
    if (relPath.startsWith("http")) continue; // external link in SUMMARY
    currentSection.items.push({ title: title.trim(), relPath, depth: indent.length });
  }
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function resolveInclude(fileDir, includeArg) {
  const [incPath] = includeArg.trim().split(/\s+/); // ignore anchor:LINES syntax
  const target = join(fileDir, incPath);
  if (existsSync(target)) return readFileSync(target, "utf8");
  return null;
}

function transformChapter(relPath, chapterSlug) {
  const abs = join(srcDir, relPath);
  if (!existsSync(abs)) return { body: null, quizFiles: [] };
  let body = readFileSync(abs, "utf8");
  const fileDir = dirname(abs);
  const quizFiles = [];

  // {{#quiz path.toml}} -> strip, remember for RecallQuiz
  body = body.replace(/\{\{\s*#quiz\s+(.+?)\s*\}\}/g, (_, p) => {
    quizFiles.push(join(fileDir, p.trim()));
    return "";
  });

  // {{#include path}} / {{#rustdoc_include path}} -> inline verbatim, or
  // leave a visible TODO. rustdoc_include is the same transclusion
  // directive, just wrapping the target in a rustdoc-hidden-lines fence;
  // we don't need that distinction since we don't run rustdoc ourselves.
  body = body.replace(/\{\{\s*#(?:rustdoc_)?include\s+(.+?)\s*\}\}/g, (_, arg) => {
    const inlined = resolveInclude(fileDir, arg);
    return inlined ?? `<!-- TODO: unresolved {{#include ${arg}}} -->`;
  });

  // aquascope directives are plain rust attributes inside fenced code
  // blocks (e.g. `#![aquascope::show]`) — mdbook's aquascope preprocessor
  // strips these before rendering; without it, drop the lines so they
  // don't show up as literal text in the rendered snippet.
  body = body
    .split("\n")
    .filter((l) => !/^\s*#!?\[?\s*aquascope/.test(l))
    .join("\n");

  return { body, quizFiles };
}

const sidebarOut = [];
const vocabularyChapters = []; // written for scripts/check-vocabulary.mjs to cross-check against

for (const section of sections) {
  const sidebarItems = [];
  for (const item of section.items) {
    chapterIndex += 1;
    // Upstream's own filenames already encode chapter/section order
    // (e.g. ch03-02-data-types.md) and are unique — more robust to reuse
    // them as the slug than to re-derive numbering ourselves, especially
    // for nested sub-chapter pages (item.depth > 0).
    const baseName = item.relPath.replace(/\.md$/, "").split("/").pop();
    const slug = baseName || `${String(chapterIndex).padStart(3, "0")}-${slugify(item.title)}`;
    const { body, quizFiles } = transformChapter(item.relPath, slug);
    if (body == null) continue;

    const frontmatter = [
      "---",
      `title: ${JSON.stringify(item.title)}`,
      `sidebar:`,
      `  order: ${chapterIndex}`,
      "---",
      "",
    ].join("\n");
    writeFileSync(join(OUT_DOCS, `${slug}.md`), frontmatter + body);

    const questions = [];
    for (const qFile of quizFiles) {
      if (!existsSync(qFile)) continue;
      try {
        const parsed = parseToml(readFileSync(qFile, "utf8"));
        if (Array.isArray(parsed.questions)) questions.push(...parsed.questions);
      } catch (e) {
        console.warn(`[fetch-book] could not parse quiz ${qFile}: ${e.message}`);
      }
    }
    if (questions.length) {
      writeFileSync(join(OUT_QUIZ, `${slug}.json`), JSON.stringify(questions, null, 2));
    }

    sidebarItems.push({ label: item.title, link: `/book/${slug}/` });
    vocabularyChapters.push({ slug, chapterIndex, title: item.title });
  }
  if (sidebarItems.length) sidebarOut.push({ label: section.label, items: sidebarItems });
}

writeFileSync(join(OUT_GEN, "sidebar.json"), JSON.stringify(sidebarOut, null, 2));
writeFileSync(
  join(OUT_GEN, "chapters.json"),
  JSON.stringify({ bookCommit, chapters: vocabularyChapters }, null, 2)
);

console.log(
  `[fetch-book] wrote ${vocabularyChapters.length} chapter pages, ${
    readdirSync(OUT_QUIZ).length
  } quiz files.`
);
