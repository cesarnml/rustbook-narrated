# Chapter 2 exercise — number classifier

**Time:** ~45-60 minutes. **Uses only:** `let mut`, `loop`/`break`/`continue`, `match`, `std::io`,
`.parse()`, string slices (`&str`), `i32`.

## The task

A loop that reads a line, and:
- if it's `"quit"`, exits the loop
- if it doesn't parse as an `i32`, prints an error and asks again
- otherwise, classifies the number as zero / even / odd, and negative or not, e.g. `-4` → `negative even`

## The subtlety worth grokking

`.parse()` returns `Result<T, E>` — `match`-ing on it is the same pattern the book's own guessing-game
project uses for exactly the same reason: a `Result` forces you to handle the failure case (bad input)
right where it happens, instead of letting a bad parse panic three lines later somewhere you didn't expect.
`Err(_)` here throws away the actual parse error — that's a deliberate simplification appropriate at this
stage; chapter 9 is where you'll learn the vocabulary for *why* silently discarding an error is sometimes
fine and sometimes a real problem.

Also notice: `input.trim()` returns a **new `&str` borrowing from `input`**, not an owned `String` — you
haven't officially met borrowing yet (that's chapter 4), but you're already relying on it. Shadowing
`let input = input.trim();` reuses the name on purpose; it's a preview, not a coincidence.
