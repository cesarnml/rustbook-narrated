# The Rust Book, Narrated

**Live:** <https://rust-book-narrated.vercel.app>

An [Astro](https://astro.build) + [Starlight](https://starlight.astro.build) companion site for **"The Rust
Programming Language"** — including the interactive quizzes from the
[Brown CS edition](https://rust-book.cs.brown.edu) — with a "🔊 Listen" mode powered by
[Kokoro](https://github.com/hexgrad/kokoro) (100% in-browser), plus original hands-on exercises after every
chapter.

Sibling project: [`zed-rust-for-dummies`](https://github.com/cesarnml/zed-rust-for-dummies) shares this
site's Starlight + narrator design, documenting a real Rust PR against the Zed editor instead of the book.

Nothing from upstream is vendored or retyped: the book text and quiz question data are cloned fresh on
every build and transformed into Starlight pages (see [`scripts/fetch-book.mjs`](./scripts/fetch-book.mjs)).
See [`ATTRIBUTION.md`](./ATTRIBUTION.md) for exactly what comes from where and under what license.

## How it works

- **Content**: `scripts/fetch-book.mjs` clones
  [`cognitive-engineering-lab/rust-book`](https://github.com/cognitive-engineering-lab/rust-book) at
  build/dev time, parses `SUMMARY.md` for chapter order, strips mdbook-only directives
  (`{{#quiz}}`, `{{#include}}`, `aquascope`), and writes one Starlight page per chapter plus one JSON file
  of quiz question data per chapter with a quiz.
- **Quizzes**: `mdbook-quiz` is an mdbook-only Rust preprocessor and can't run inside an Astro build, so
  `src/components/RecallQuiz.astro` is an original, minimal quiz UI that renders the same question data.
- **Narrator**: `narrator/` (unchanged from before) is a vanilla-JS toolbar, bundled with esbuild and
  injected into every page via the `PageFrame` Starlight component override
  (`src/components/NarratorPageFrame.astro`). Lazy-loads `kokoro-js` + the model on first ▶ press, reads
  paragraphs/headings/list items (skipping code), and runs everything through
  `narrator/src/pronunciation-dictionary.js` + `narrator/src/heteronyms.js` first — see
  [`docs/DICTIONARY.md`](./docs/DICTIONARY.md).
- **Exercises**: `exercises/chNN-*/` are original, standalone Cargo projects — a starter (with `TODO`s,
  expected not to compile yet) and a reference solution — one per book chapter, ~1-2 hours each, gated by
  `scripts/check-vocabulary.mjs` so a chapter's exercise can't accidentally use a concept the book hasn't
  covered yet. See [Exercises](./exercises/) and the site's [Exercises page](https://rust-book-narrated.vercel.app/exercises/).

## Running it locally

```bash
npm install
npm run dev      # fetches the book, builds the narrator, checks vocabulary, then astro dev
```

## Deployment

- **Vercel** — `vercel.json`, git-linked to this repo, redeploys on every push. Runs `npm run build`,
  which fetches the book fresh via `npm run prebuild` first (no Rust/mdbook toolchain needed anymore —
  see "How it works" above).
- **GitHub Pages** — `.github/workflows/deploy.yml`, on push to `main` and weekly (so upstream book/quiz
  updates show up here automatically even without a push).

CI also runs `cargo test` against every exercise's solution (not its starter — the starter is supposed to
be incomplete) and `scripts/check-vocabulary.mjs` against all of them.

## Scope

Same as before: upstream's `aquascope` preprocessor (interactive ownership/borrow-check diagrams) needs its
own analysis backend and is out of scope here. Everything else — every chapter, every quiz — comes through.

## License

Site code: MIT OR Apache-2.0, matching upstream — see `LICENSE-MIT` / `LICENSE-APACHE`. Book text/quizzes:
see `ATTRIBUTION.md`.
