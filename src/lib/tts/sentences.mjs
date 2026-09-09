/**
 * Sentence splitting, shared by the build-time DOM pass and the audio
 * generator.
 *
 * There is deliberately only one splitter. The highlight spans in the page
 * and the audio segments must agree on where sentence 7 starts, and the
 * cheapest way to guarantee that is to have both derive from this function
 * rather than from two implementations that agree today.
 *
 * Ported from zed-rust-for-dummies's src/lib/tts/sentences.mjs. The
 * project-specific PRONUNCIATIONS entries there (gpui/zed-specific homograph
 * fixes) are dropped; ABBREVIATIONS and splitSentences/tidyForSpeech are
 * generic and kept as-is.
 */

/** Words that end in a period without ending a sentence. */
const ABBREVIATIONS = new Set([
  'e.g', 'i.e', 'etc', 'vs', 'cf', 'approx', 'fig', 'no',
  'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'jr', 'sr',
  'inc', 'ltd', 'co', 'dept', 'univ', 'al',
]);

/**
 * Find sentence boundaries in a run of text.
 *
 * @param {string} text
 * @returns {Array<{start: number, end: number}>} half-open ranges over `text`
 */
export function splitSentences(text) {
  const ranges = [];
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== '.' && ch !== '!' && ch !== '?') continue;

    // Consume a run of terminators plus any closing quote or bracket, so
    // `?"` and `!)` stay with the sentence they end.
    let j = i;
    while (j + 1 < text.length && '.!?'.includes(text[j + 1])) j++;
    while (j + 1 < text.length && '"\')]}”’'.includes(text[j + 1])) j++;

    const after = text.slice(j + 1);
    // A boundary needs whitespace (or end of input) after it.
    if (after && !/^\s/.test(after)) continue;
    // ...and the next non-space character should start something new.
    if (after.trim() && !/^\s*["'(“‘]?[A-Z0-9—-]/.test(after)) continue;

    const before = text.slice(start, i);

    // An abbreviation, not a full stop.
    if (ch === '.') {
      const lastWord = before.match(/([A-Za-z.]+)$/)?.[1]?.toLowerCase().replace(/\.$/, '');
      if (lastWord && ABBREVIATIONS.has(lastWord)) continue;
      // A single capital letter is an initial (`J. Doe`).
      if (/(^|\s)[A-Z]$/.test(before)) continue;
      // A decimal or version number (`1.0`, `v1.2.3`).
      if (/\d$/.test(before) && /^\d/.test(text.slice(i + 1))) continue;
    }

    const end = j + 1;
    if (text.slice(start, end).trim()) ranges.push({ start, end });
    start = end;
    i = j;
  }

  if (text.slice(start).trim()) ranges.push({ start, end: text.length });

  // The ranges must tile `text` exactly — the caller slices the DOM with
  // them, so a gap would delete the character from the page. The whitespace
  // between two sentences is therefore handed to the preceding one rather
  // than trimmed away, which still leaves each highlight starting on a
  // visible character.
  const tiled = [];
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    if (i === 0) {
      tiled.push({ ...range });
      continue;
    }
    let s = range.start;
    while (s < range.end && /\s/.test(text[s])) s++;
    tiled[tiled.length - 1].end = s;
    tiled.push({ start: s, end: range.end });
  }
  return tiled;
}

/**
 * Words the synthesiser says wrong, respelled so that it doesn't.
 *
 * This layer is audio-only — `tidyForSpeech` feeds the generator and never
 * touches the rendered page — so an entry here changes what you hear and
 * nothing you read.
 */
const PRONUNCIATIONS = [
  // Read as "turb-of-fish", every time. The space is the whole fix.
  [/\bturbofish\b/gi, 'turbo fish'],
];

/** Apply {@link PRONUNCIATIONS} in order, preserving a leading capital. */
function respell(text) {
  let out = text;
  for (const [pattern, said] of PRONUNCIATIONS) {
    out = out.replace(pattern, (match, ...groups) => {
      const expanded = said.replace(/\$(\d)/g, (_m, n) => groups[n - 1] ?? '');
      return /^[A-Z]/.test(match) ? expanded[0].toUpperCase() + expanded.slice(1) : expanded;
    });
  }
  return out;
}

/**
 * Normalise text for the synthesiser: collapse whitespace, strip the
 * markdown residue that survives into rendered text nodes, and respell the
 * words the synthesiser gets wrong.
 *
 * @param {string} text
 */
export function tidyForSpeech(text) {
  return respell(text)
    .replace(/ /g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, ', ')
    .replace(/–/g, ' to ')
    .replace(/\s+/g, ' ')
    // Inline code is padded with spaces when it is expanded, which can
    // leave a gap in front of the punctuation that follows it.
    .replace(/\s+([,.;:!?)\]])/g, '$1')
    .replace(/([(\[])\s+/g, '$1')
    .replace(/,\s*,/g, ',')
    .trim();
}
