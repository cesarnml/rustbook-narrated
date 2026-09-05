# Chapter 4 exercise — sentence report, no cloning allowed

**Time:** ~60-75 minutes. **Uses only:** `String` vs `&str`, `&`/borrowing, string slices, `.len()`.

## The task

Given a `String`, find its longest word and count its words — both by borrowing (`&sentence`), never by
moving or cloning it. The `main` below still needs `sentence` after both calls; if either function took
ownership of it, that last `println!` wouldn't compile.

## The subtlety worth grokking

`longest_word` returns `&str`, not `String` — the return value is a **slice pointing back into the caller's
original string**, not a new allocation. That's the entire point of chapter 4's slice section: you can
extract information *about* a string without copying it. Try changing the return type to `String` and
returning `longest.to_string()` — it'll compile fine, but you've now allocated a second copy of the word for
no reason, and if `sentence` were huge that copy would be too.

The compiler error you'll hit if you (deliberately) pass `sentence` instead of `&sentence` is worth reading
slowly: it says the value was **moved** into the function call, and reports the exact later line where you
tried to use it again. That "value borrowed here after move" pattern is the single most common error message
you'll see for the rest of the book — this exercise exists so you meet it once, on purpose, in the smallest
possible program, before it ambushes you inside something bigger.
