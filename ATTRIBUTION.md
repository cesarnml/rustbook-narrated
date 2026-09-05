# Attribution

This project is a wrapper around other people's work, not a rewrite of it.
Nothing here vendors or re-hosts that work's text — it's fetched fresh from
the original repos at build time (see `.github/workflows/deploy.yml`).

## The book text and quizzes

**"The Rust Programming Language"** — by Steve Klabnik, Carol Nichols, and
the Rust community. Source: <https://github.com/rust-lang/book>.
Dual-licensed under [MIT](https://github.com/rust-lang/book/blob/main/LICENSE-MIT)
and [Apache-2.0](https://github.com/rust-lang/book/blob/main/LICENSE-APACHE).

This site actually builds from the **interactive edition with quizzes**,
maintained by the Cognitive Engineering Lab at Brown University as a fork
of the book above: <https://github.com/cognitive-engineering-lab/rust-book>
(published at <https://rust-book.cs.brown.edu>). Same dual MIT/Apache-2.0
license — see `LICENSE-MIT`/`LICENSE-APACHE` in that repo. It adds the
`mdbook-quiz` preprocessor: <https://github.com/cognitive-engineering-lab/mdbook-quiz>.

This build intentionally **drops** the upstream `aquascope` preprocessor
(interactive ownership/borrow-checker visualizations) — it needs its own
analysis backend, which is out of scope for what this project adds. Every
chapter's text is otherwise unmodified. Quizzes are re-rendered from
upstream's own question data (see below) rather than run through the real
`mdbook-quiz` preprocessor, since that preprocessor only runs inside an
`mdbook build` and this site is built with Astro instead. See
`scripts/fetch-book.mjs` for the exact transform.

## The exercises and quiz UI

`exercises/` (per-chapter Cargo projects) and `src/components/RecallQuiz.astro`
(the in-browser quiz UI) are original to this repo — written for it, not
derived from either upstream repo. `RecallQuiz.astro` consumes upstream's
quiz *question data*, parsed from their `.toml` files at build time, but
its rendering/scoring code is this project's own.

## The voice

**Kokoro** — an 82M-parameter open-weight TTS model by hexgrad, released
under Apache-2.0: <https://github.com/hexgrad/kokoro>. This project uses
the `kokoro-js` package (<https://www.npmjs.com/package/kokoro-js>), which
runs the model 100% client-side via Transformers.js/ONNX Runtime Web — no
audio, and no page text, is ever sent to a server.

## What's original to this repo

- `narrator/` — the "Listen" toolbar, the coding-term/heteronym
  pronunciation dictionary, and the text-to-Kokoro wiring.
- `scripts/fetch-book.mjs` — the build-time clone + transform described above.
- `src/components/RecallQuiz.astro`, `src/components/NarratorPageFrame.astro` — the quiz UI and narrator wiring.
- `exercises/` — the per-chapter Cargo exercises.
- `.github/workflows/deploy.yml` — ties it all together for GitHub Pages.

Licensed the same way as its upstream, MIT OR Apache-2.0 (`LICENSE-MIT` /
`LICENSE-APACHE` in this repo), so the whole built site stays under one
consistent, permissive license.
