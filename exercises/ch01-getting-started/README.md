# Chapter 1 exercise — say two things two ways

**Time:** ~15-20 minutes. **Uses only:** `cargo new`/`cargo run`, `println!`, `let`, string literals.

## The task

Print your name and today's date, first as two separate `println!` calls, then again as a single
`println!` call using two `{}` placeholders fed by variables you `let`-bind first.

## The subtlety worth grokking

`println!` is a **macro**, not a function — that's what the `!` means. You'll see this fact matter a lot
starting in later chapters (macros can accept a variable number of arguments and inspect the format string
at compile time; a function couldn't validate `"{} {}"` against the argument count you passed). For now,
just notice: the compiler will refuse to build if the number of `{}` placeholders doesn't match the number
of arguments after the format string. Try mismatching them on purpose and read the error.

Also notice `cargo build` emits a warning for a variable you `let` but never use — that's the compiler
telling you about a very common bug (a typo'd variable name that silently created a new unused binding
instead of using the one you meant). Chapter 1 is early enough that the fix is just "use it or prefix it
with `_`," but keep an eye out — this warning catches real bugs later too.

Run `cargo run --bin starter` to check your work; `cargo run --bin solution` shows a reference version.
