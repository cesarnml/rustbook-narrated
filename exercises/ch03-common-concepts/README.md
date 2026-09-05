# Chapter 3 exercise — temperature stats

**Time:** ~45-60 minutes. **Uses only:** functions with typed params/return, `f64`, arrays, tuples,
`for`/`while` loops, `if` as an expression, `assert_eq!`.

## The task

Convert an array of 5 Celsius readings to Fahrenheit, then compute `(min, max, average)` as a tuple,
using plain `for` loops (no iterator adapters — chapter 13 is where those show up).

## The subtlety worth grokking

Rust functions return their **last expression**, not a `return`-ed value — `c * 9.0 / 5.0 + 32.0` with no
trailing semicolon *is* the return value; add a semicolon and watch the compiler complain the function now
returns `()` instead of `f64`. This trips up almost everyone coming from a semicolon-terminated language, and
it's the same rule `if`/`match`/blocks all follow — `if r < min { r } else { min }` is a valid expression
for exactly this reason, well before you formally meet `if let` or full pattern matching.

Also: arrays (`[f64; 5]`) have a length baked into their *type*. `readings.len()` is always 5 here — there's
no way to build one with a different length by accident, which is part of why the book introduces `Vec`
(growable, length not part of the type) as a separate, later concept rather than starting with it.
