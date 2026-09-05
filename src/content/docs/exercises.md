---
title: Exercises
sidebar:
  order: 2
---

Original, hands-on Cargo projects — one per book chapter, ~1-2 hours each, deliberately restricted to what
that chapter (and the ones before it) has actually covered. Each has a starter (with `TODO`s, meant to not
compile until you fill them in) and a reference solution, checked in CI so neither goes stale.

Open them from [the repo's `exercises/` directory](https://github.com/cesarnml/rustbook-narrated/tree/main/exercises) —
each has its own `README.md` with the prompt and the specific subtlety it's aimed at:

1. [Getting started](https://github.com/cesarnml/rustbook-narrated/tree/main/exercises/ch01-getting-started) — `println!` as a macro, unused-variable warnings
2. [Number classifier](https://github.com/cesarnml/rustbook-narrated/tree/main/exercises/ch02-guessing-game) — `Result`-handling via `match`, an early taste of borrowing
3. [Temperature stats](https://github.com/cesarnml/rustbook-narrated/tree/main/exercises/ch03-common-concepts) — expression-vs-statement, fixed-length arrays
4. [Sentence report](https://github.com/cesarnml/rustbook-narrated/tree/main/exercises/ch04-ownership) — slices, move-vs-borrow, reading a "value borrowed after move" error on purpose

More chapters are added as the corresponding book chapter's exercise is written — see the repo's issues for
what's next.

```bash
cd exercises/ch04-ownership
cargo run --bin starter    # fill in the TODOs until this compiles and runs
cargo run --bin solution   # a working reference, if you get stuck
```
