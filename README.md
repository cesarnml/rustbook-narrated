# The Rust Book, Narrated

The full text of **"The Rust Programming Language"** — including the
interactive quizzes from the [Brown CS edition](https://rust-book.cs.brown.edu)
— with a "🔊 Listen" mode powered by [Kokoro](https://github.com/hexgrad/kokoro),
an open-weight TTS model that runs 100% in your browser. Follow along by
ear instead of reading every word, without the reader mangling `char`,
`enum`, `impl`, or mixing up "the object LIVES on the heap" with "nine
LYVES".

Nothing is vendored or retyped here: the book text and quizzes are cloned
fresh from the official sources on every deploy, and this repo only adds
the narration layer on top. See [`ATTRIBUTION.md`](./ATTRIBUTION.md) for
exactly what comes from where and under what license.

## How it works

- **Content**: [`cognitive-engineering-lab/rust-book`](https://github.com/cognitive-engineering-lab/rust-book)
  is cloned at build time — the book text, chapter structure, and all 90+
  quiz files, unmodified.
- **Narrator**: `narrator/` is a small vanilla-JS toolbar, bundled with
  esbuild, that gets injected into every rendered page. On first press of
  ▶, it lazy-loads `kokoro-js` and Kokoro's model (cached by your browser
  afterwards), reads the page's paragraphs/list items/headings one at a
  time — skipping code blocks — and highlights + auto-scrolls to whatever
  it's currently reading.
- **Pronunciation**: before any text reaches Kokoro, it's run through
  `narrator/src/pronunciation-dictionary.js` (coding jargon → plain-English
  respellings, e.g. `SQL` → "sequel") and `narrator/src/heteronyms.js`
  (context-aware disambiguation for words like `lives`, `read`, `object`,
  `use`, `close` — same spelling, different sound depending on meaning).
  See [`docs/DICTIONARY.md`](./docs/DICTIONARY.md) for the full
  reasoning and how to extend it.
- **Build**: `.github/workflows/deploy.yml` clones the book, builds the
  narrator bundle, patches the book's `book.toml` to load it
  (`scripts/patch-book-toml.mjs` — the *only* change made to upstream's
  config), runs `mdbook build` (with the real `mdbook-quiz` preprocessor,
  so quizzes are the real thing, not a reimplementation), and deploys the
  output to GitHub Pages. It also runs weekly, so upstream book/quiz
  updates show up here automatically.

## Running it locally

```bash
# 1. Build the narrator bundle
cd narrator && npm install && npm test && npm run build && cd ..

# 2. Get the book
git clone --depth 1 https://github.com/cognitive-engineering-lab/rust-book.git book

# 3. Wire the narrator in
cp narrator/dist/narrator.bundle.js book/narrator.bundle.js
cp narrator/src/narrator.css book/narrator.css
npm install && node scripts/patch-book-toml.mjs book/book.toml

# 4. Build the book (requires Rust + mdbook + mdbook-quiz)
cargo install mdbook --locked
cargo install mdbook-quiz --locked
cd book && mdbook serve
```

Then open <http://localhost:3000>.

## Scope

This build intentionally skips upstream's `aquascope` preprocessor (the
interactive ownership/borrow-checker diagrams) — it needs its own analysis
backend, which is out of scope for what this project is adding. Everything
else — every chapter, every quiz — comes through untouched.

## License

MIT OR Apache-2.0, matching upstream — see `LICENSE-MIT` / `LICENSE-APACHE`.
