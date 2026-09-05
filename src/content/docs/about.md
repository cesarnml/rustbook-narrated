---
title: How this site works
sidebar:
  order: 1
---

## What's cloned, what's original

Nothing under `/book/` is written by this project. `scripts/fetch-book.mjs` clones
[`cognitive-engineering-lab/rust-book`](https://github.com/cognitive-engineering-lab/rust-book) fresh on every
build, converts its chapters into Starlight pages, and pulls each chapter's `mdbook-quiz` question data into
[`RecallQuiz.astro`](https://github.com/cesarnml/rustbook-narrated/blob/main/src/components/RecallQuiz.astro) —
a small original component, since `mdbook-quiz` itself only runs inside an `mdbook build` and can't run here.

Everything under `/exercises/` is original: hands-on Cargo projects written for this site, one per chapter,
designed to take about an hour and to use nothing the book hasn't introduced by that point yet (checked by
`scripts/check-vocabulary.mjs` in CI — see [`vocabulary.json`](https://github.com/cesarnml/rustbook-narrated/blob/main/exercises/vocabulary.json)).

The narrator (`narrator/`) is a small vanilla-JS toolbar, bundled separately and injected into every page. It
lazy-loads [Kokoro](https://github.com/hexgrad/kokoro) on first ▶ press, reads paragraphs/headings/list items
aloud (skipping code blocks), and runs everything through a pronunciation dictionary so `impl`, `enum`, and
`char` come out right. See [`docs/DICTIONARY.md`](https://github.com/cesarnml/rustbook-narrated/blob/main/docs/DICTIONARY.md).

## Scope

Same as before: upstream's `aquascope` preprocessor (interactive ownership/borrow-check diagrams) needs its
own analysis backend and is out of scope here. Everything else — every chapter, every quiz — comes through.

## Sibling projects

This is the narrated-book half of a pair. The other half, [`zed-rust-for-dummies`](https://github.com/cesarnml/zed-rust-for-dummies),
documents a specific real-world Rust PR against the Zed editor and shares this site's Starlight + narrator
design. This site is the "learn Rust properly, one chapter at a time" companion; that one is "defend this
specific diff."
