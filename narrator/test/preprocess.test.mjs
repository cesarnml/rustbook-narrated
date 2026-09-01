import assert from "node:assert/strict";
import { test } from "node:test";
import { toSpeakableText } from "../src/preprocess.js";

const cases = [
  ["The cat has nine lives.", /nyvz|lyvz/i, "lives"],
  ["This reference lives as long as the enclosing scope.", /livz/, "lives (verb)"],
  ["We read the config file on startup.", /reed/, "read (present)"],
  ["We have already read the config file.", /\bred\b/, "read (past)"],
  ["The char type represents a single Unicode scalar value.", /\bkar\b/i, "char"],
  ["An enum lets you define a type by enumerating its variants.", /ee num/i, "enum"],
  ["Call the trait's impl block.", /im pull/i, "impl"],
  ["This tuple struct wraps a value.", /tuh pul/i, "tuple"],
  ["Rust programs are compiled ahead of time, unlike an async runtime that lives on a single thread.", /ay sink/i, "async"],
  ["We can query a SQL database directly.", /sequel/i, "SQL"],
  ["The object has three fields.", /OB jekt/i, "object (noun default)"],
  ["I strongly object to that design.", /ub JEKT/i, "object (verb alt)"],
  ["Print the content of the file.", /KON tent/i, "content (noun default)"],
  ["She seemed content with the result.", /kun TENT/i, "content (adjective alt)"],
  ["We use this crate for serialization.", /yooz/i, "use (verb default)"],
  ["Its use is limited to debugging.", /yoos/i, "use (noun alt)"],
  ["This will panic during stack unwinding.", /wynd/i, "wind (unwind)"],
  ["Close the connection when you're done.", /klohz/i, "close (verb default)"],
  ["That was a very close call.", /klohss/i, "close (adjective alt)"],
  ["Serialize the struct to TOML before writing it to disk.", /tom ul/i, "toml"],
];

test("toSpeakableText disambiguates heteronyms and coding terms", () => {
  for (const [input, expected, label] of cases) {
    const out = toSpeakableText(input);
    assert.match(out, expected, `${label}: got "${out}"`);
  }
});

test("preserves punctuation and unrelated words verbatim", () => {
  const input = "Hello, world! This sentence has no tricky words at all.";
  assert.equal(toSpeakableText(input), input);
});

test("preserves capitalization style on substitutions", () => {
  assert.match(toSpeakableText("SQL is great."), /Sequel|SEQUEL/);
  assert.match(toSpeakableText("sql is great."), /sequel/);
});
