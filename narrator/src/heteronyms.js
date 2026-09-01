// Context-sensitive respellings.
//
// A heteronym is spelled one way but pronounced differently depending on
// meaning/part of speech ("she LIVES here" vs "nine LYVES"). Kokoro's G2P
// always picks one reading, so we disambiguate ourselves with a small,
// local context check before handing text to the model.
//
// Each entry has a DEFAULT reading (used unless the ALT test matches) and
// an ALT reading with a `test(ctx)` that inspects up to 4 lowercase words
// on either side of the match. Defaults are chosen for how the word is
// actually used in a programming book, not general-English frequency —
// e.g. "object" defaults to the noun (OOP), "use" defaults to the verb
// (the `use` keyword, "we use this crate").
//
// This is deliberately a curated, high-value set — the words that (a)
// actually recur in Rust/programming prose and (b) would sound wrong or
// silly read the wrong way — not an exhaustive list of every English
// heteronym.

function any(words, list) {
  return words.some((w) => list.includes(w));
}

export const HETERONYMS = [
  {
    word: "lives",
    default: { respelling: "livz" }, // verb: "the reference lives as long as ..."
    alt: { respelling: "lyvz" }, // noun: "nine lives"
    test: (ctx) => any(ctx.before, ["nine", "many", "several", "her", "his", "their", "multiple", "extra", "two", "three", "four", "five"]),
  },
  {
    word: "live",
    default: { respelling: "liv" }, // verb: "how long a value can live"
    alt: { respelling: "lyv" }, // adjective: "a live server", "live coding"
    test: (ctx) => any(ctx.after, ["server", "demo", "stream", "coding", "audience", "broadcast"]),
  },
  {
    word: "read",
    default: { respelling: "reed" }, // present tense: "we read the file"
    alt: { respelling: "red" }, // past tense: "we have read the file"
    test: (ctx) => any(ctx.before, ["have", "has", "had", "was", "were", "been", "i've", "we've", "you've", "they've", "already"]),
  },
  {
    word: "lead",
    default: { respelling: "leed" }, // verb: "this will lead to a panic"
    alt: { respelling: "led" }, // noun: the metal
    test: (ctx) => any(ctx.before, ["a", "the", "some", "solid", "molten"]) && any(ctx.after, ["pipe", "paint", "pencil", "poisoning", "weight"]),
  },
  {
    // "unwind"/"rewind" are handled as their own dictionary entries
    // (pronunciation-dictionary.js) since they're single word tokens,
    // not "un" + "wind". This entry only covers the bare word "wind".
    word: "wind",
    default: { respelling: "wind" }, // noun: weather
    alt: { respelling: "wynd" }, // verb: to twist/coil
    test: (ctx) => any(ctx.after, ["up", "down", "back", "around"]),
  },
  {
    word: "tear",
    default: { respelling: "tair" }, // verb: to rip
    alt: { respelling: "teer" }, // noun: crying
    test: (ctx) => any(ctx.before, ["a", "one", "single"]) && any(ctx.after, ["fell", "rolled", "welled", "in", "her", "his"]),
  },
  {
    word: "bow",
    default: { respelling: "boh" }, // noun: ribbon, weapon, front of a ship
    alt: { respelling: "bow" }, // verb: to bend at the waist
    test: (ctx) => any(ctx.after, ["to", "down", "out", "before"]) || any(ctx.before, ["take", "a"]),
  },
  {
    word: "close",
    default: { respelling: "klohz" }, // verb: "close the connection"
    alt: { respelling: "klohss" }, // adjective: "a close match"
    test: (ctx) => any(ctx.before, ["very", "so", "too", "a"]) || any(ctx.after, ["to", "match", "call"]),
  },
  {
    word: "closes",
    default: { respelling: "klohzez" },
    alt: { respelling: "klohsez" },
    test: () => false,
  },
  {
    word: "object",
    default: { respelling: "OB jekt" }, // noun: OOP object
    alt: { respelling: "ub JEKT" }, // verb: to protest
    test: (ctx) => any(ctx.before, ["i", "we", "they", "don't", "won't", "wouldn't", "strongly"]) && any(ctx.after, ["to"]),
  },
  {
    word: "content",
    default: { respelling: "KON tent" }, // noun: "the file's content"
    alt: { respelling: "kun TENT" }, // adjective: satisfied
    test: (ctx) => any(ctx.before, ["is", "was", "feel", "feels", "felt", "seem", "seems", "seemed", "so", "very"]),
  },
  {
    word: "record",
    default: { respelling: "REK erd" }, // noun
    alt: { respelling: "ri KORD" }, // verb
    test: (ctx) => any(ctx.before, ["to", "will", "let's", "we", "i'll", "please"]),
  },
  {
    word: "present",
    default: { respelling: "PREZ ent" }, // noun/adjective
    alt: { respelling: "pri ZENT" }, // verb: to show
    test: (ctx) => any(ctx.before, ["to", "will", "let's", "we", "i'll", "can", "could", "will"]) && any(ctx.after, ["the", "a", "this", "results"]),
  },
  {
    word: "produce",
    default: { respelling: "pruh DOOS" }, // verb: "this function will produce ..."
    alt: { respelling: "PROH doos" }, // noun: food
    test: (ctx) => any(ctx.before, ["fresh", "organic", "the", "some"]) && !any(ctx.after, ["a", "the", "an", "output", "result", "value"]),
  },
  {
    word: "project",
    default: { respelling: "PROJ ekt" }, // noun: "the Cargo project"
    alt: { respelling: "pruh JEKT" }, // verb: to cast forward
    test: (ctx) => any(ctx.before, ["will", "to"]) && any(ctx.after, ["onto", "forward", "outward"]),
  },
  {
    word: "minute",
    default: { respelling: "MIN it" }, // noun: time
    alt: { respelling: "my NOOT" }, // adjective: tiny
    test: (ctx) => any(ctx.before, ["a", "very", "extremely", "such", "so"]) && any(ctx.after, ["detail", "details", "difference", "amount", "change"]),
  },
  {
    word: "use",
    default: { respelling: "yooz" }, // verb, and Rust's `use` keyword
    alt: { respelling: "yoos" }, // noun: "of no use", "its use is limited"
    test: (ctx) => any(ctx.before, ["no", "any", "some", "little", "further", "of", "its", "this", "that", "each", "every", "proper", "common"]),
  },
  {
    word: "row",
    default: { respelling: "roh" }, // noun: a table/database row
    alt: { respelling: "row" }, // rare: an argument, or to row a boat
    test: () => false,
  },
  {
    word: "console",
    default: { respelling: "KON sohl" }, // noun: the terminal/device
    alt: { respelling: "kun SOHL" }, // verb: to comfort (essentially never appears in this context)
    test: () => false,
  },
  {
    word: "invalid",
    default: { respelling: "in VAL id" }, // "not valid" — the only sense that comes up here
    alt: { respelling: "IN vuh lid" }, // a sick/infirm person (archaic, out of scope)
    test: () => false,
  },
  {
    word: "refuse",
    default: { respelling: "ri FYOOZ" }, // verb: to decline
    alt: { respelling: "REF yoos" }, // noun: garbage (out of scope for this book)
    test: () => false,
  },
  {
    word: "entrance",
    default: { respelling: "EN trense" }, // noun: a doorway
    alt: { respelling: "en TRANSE" }, // verb: to mesmerize (out of scope)
    test: () => false,
  },
];
