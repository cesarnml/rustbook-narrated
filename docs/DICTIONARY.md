# The pronunciation dictionary

`narrator/src/pronunciation-dictionary.js` and `narrator/src/heteronyms.js`
are the actual dictionary. This doc explains the approach and how to add to it.

## Two kinds of mispronunciation

**1. Coding/CS jargon that plain English rules get wrong.**
`char` isn't "chair", `enum` isn't "EN-um", `SQL` is "sequel" not "S-Q-L"
(usually), `impl` is "im-pull". These are fixed with a flat, whole-word
lookup table (`pronunciation-dictionary.js`) — case-insensitive, matched on
word boundaries, substituted with a plain-English respelling before the
text ever reaches Kokoro (so it works regardless of Kokoro's version or
G2P backend).

**2. Heteronyms — words that are spelled the same but pronounced
differently depending on meaning.** This is the "lives" example: *"she
LIVES in a house"* (verb, rhymes with "gives") vs. *"a cat has nine
LYVES"* (noun, rhymes with "hives"). A flat lookup table can't handle
these — the same spelling needs two different outputs depending on
context. `heteronyms.js` handles this with a small, local context check
(the few words immediately before/after the match) per word.

## Why these specific heteronyms

Not every English heteronym is here — that list is enormous and mostly
irrelevant to a programming book. The set in `heteronyms.js` is the
intersection of "actually recurs in Rust/programming prose" and "sounds
genuinely silly read the wrong way": `object` (OOP noun vs. "I object"),
`content` (file content vs. "feeling content"), `use` (the `use` keyword
and "we use this crate" vs. "of no use"), `close` ("close the connection"
vs. "a close match"), `read`/`lives`/`lead`/`wind` and a few others.

Each entry has a **default** reading, used unless its `test()` matches —
and defaults are picked for *how the word shows up in a programming book*,
not general-English frequency. `object` defaults to the noun because OOP
text says "object" constantly and "I object to this design" essentially
never comes up; `use` defaults to the verb for the same reason.

A few (`console`, `invalid`, `refuse`, `entrance`, `row`) are listed with
`test: () => false` — meaning they always use the default. They're
heteronyms in general English, but only one sense of each ever plausibly
shows up in this book (`console` the terminal, never "to console
someone"), so a context test would just be dead code. They're kept as
explicit entries — with the other sense documented in a comment — so the
reasoning is visible and future contributors don't have to rediscover it.

## Extending it

1. **New jargon term**, one obvious pronunciation → add a line to
   `PRONUNCIATION_DICTIONARY` in `pronunciation-dictionary.js`. Respell it
   as an ordinary-looking English word/phrase (see the existing entries).
2. **New heteronym** → add an entry to `HETERONYMS` in `heteronyms.js`
   with `default`, `alt`, and a `test(ctx)` that looks at `ctx.before` /
   `ctx.after` (arrays of up to 4 lowercase surrounding words). Keep the
   test simple and comment *why* you picked that default — that's the
   part that's easy to get backwards.
3. Add a case to `narrator/test/preprocess.test.mjs` and run
   `npm test` inside `narrator/`. A dictionary you can't demonstrate with
   a sentence is a dictionary that's guessing.

This is a heuristic system, not a real part-of-speech tagger — it will
occasionally pick the wrong sense on an unusual sentence. That's a fine
trade-off for "the common case sounds right and nothing sounds silly",
which is the actual goal.
