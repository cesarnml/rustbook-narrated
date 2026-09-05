// ch04 starter: report on a sentence's words without ever cloning the
// string. Fill in the TODOs. No structs/enums yet — those are chapter 5/6.

fn longest_word(s: &str) -> &str {
    // TODO 1: return the longest whitespace-separated word in `s`, as a
    // slice into `s` (not a new owned String). `.split_whitespace()`
    // gives you an iterator of &str slices to compare lengths on.
    s
}

fn word_count(s: &str) -> usize {
    // TODO 2: return how many whitespace-separated words are in `s`.
    0
}

fn main() {
    let sentence = String::from("a rusty compiler outsmarts every careless programmer");

    // TODO 3: call longest_word and word_count by passing `&sentence`, not
    // `sentence` — moving it would make the println! below fail to
    // compile since `sentence` would no longer be valid. Try passing
    // `sentence` (no `&`) once on purpose and read the compiler error
    // before switching back to `&sentence`.

    println!("longest word: {}", longest_word(&sentence));
    println!("word count: {}", word_count(&sentence));
    println!("original still usable: {sentence}");
}
