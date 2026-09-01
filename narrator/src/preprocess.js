// Turns book prose into text Kokoro will pronounce well: whole-word
// dictionary substitution (pronunciation-dictionary.js) plus
// context-aware heteronym disambiguation (heteronyms.js).
//
// Pure function, no DOM/browser APIs, so it's easy to unit test and to
// reuse from both the in-page reader and a Node test script.

import { PRONUNCIATION_DICTIONARY } from "./pronunciation-dictionary.js";
import { HETERONYMS } from "./heteronyms.js";

const HETERONYM_MAP = new Map(HETERONYMS.map((h) => [h.word, h]));
const CONTEXT_WINDOW = 4;

// Split into alternating word / non-word chunks, keeping every character
// (punctuation, whitespace, code-span backticks already stripped upstream)
// so re-joining reproduces the original text exactly except where we
// substitute a respelling.
function tokenize(text) {
  return text.split(/([A-Za-z']+)/);
}

function preserveCase(original, replacement) {
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function toSpeakableText(text) {
  const chunks = tokenize(text);
  const wordIndices = [];
  chunks.forEach((chunk, i) => {
    if (i % 2 === 1) wordIndices.push(i);
  });

  const lowerWordAt = (chunkIndex) => chunks[chunkIndex].toLowerCase();

  const contextFor = (pos) => {
    const idx = wordIndices.indexOf(pos);
    const before = [];
    const after = [];
    for (let k = idx - 1; k >= 0 && before.length < CONTEXT_WINDOW; k--) {
      before.unshift(lowerWordAt(wordIndices[k]));
    }
    for (let k = idx + 1; k < wordIndices.length && after.length < CONTEXT_WINDOW; k++) {
      after.push(lowerWordAt(wordIndices[k]));
    }
    return { before, after };
  };

  for (const pos of wordIndices) {
    const word = chunks[pos];
    const lower = word.toLowerCase();

    const heteronym = HETERONYM_MAP.get(lower);
    if (heteronym) {
      const ctx = contextFor(pos);
      const useAlt = heteronym.test(ctx);
      const respelling = useAlt ? heteronym.alt.respelling : heteronym.default.respelling;
      chunks[pos] = preserveCase(word, respelling);
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(PRONUNCIATION_DICTIONARY, lower)) {
      chunks[pos] = preserveCase(word, PRONUNCIATION_DICTIONARY[lower]);
    }
  }

  return chunks.join("");
}
