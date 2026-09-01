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
chapter and every quiz from upstream is otherwise unmodified. See
`scripts/patch-book-toml.mjs` for the exact, minimal change this project
makes to the upstream `book.toml`.

## The voice

**Kokoro** — an 82M-parameter open-weight TTS model by hexgrad, released
under Apache-2.0: <https://github.com/hexgrad/kokoro>. This project uses
the `kokoro-js` package (<https://www.npmjs.com/package/kokoro-js>), which
runs the model 100% client-side via Transformers.js/ONNX Runtime Web — no
audio, and no page text, is ever sent to a server.

## What's original to this repo

- `narrator/` — the "Listen" toolbar, the coding-term/heteronym
  pronunciation dictionary, and the text-to-Kokoro wiring.
- `scripts/patch-book-toml.mjs` — the build-time patch described above.
- `.github/workflows/deploy.yml` — ties it all together for GitHub Pages.

Licensed the same way as its upstream, MIT OR Apache-2.0 (`LICENSE-MIT` /
`LICENSE-APACHE` in this repo), so the whole built site stays under one
consistent, permissive license.
