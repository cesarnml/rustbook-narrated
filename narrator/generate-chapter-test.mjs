// One-chapter validation run: extract readable blocks from a built chapter's
// HTML (same tags the live narrator reads), run them through the same
// toSpeakableText() pipeline, and generate real Kokoro audio for each block
// via kokoro-js under Node (CPU). Output: numbered .wav files + a
// manifest.json (text + timing) for playback/review before committing to
// the full 116-chapter run.
import { KokoroTTS } from "kokoro-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { toSpeakableText } from "./src/preprocess.js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICE = "af_heart";
const CHAPTER = process.argv[2] ?? "ch04-01-what-is-ownership";
const OUT_DIR = `../.audio-test/${CHAPTER}`;

const html = readFileSync(`../dist/book/${CHAPTER}/index.html`, "utf8");
const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
if (!mainMatch) throw new Error("no <main> found");
let main = mainMatch[1];
main = main.replace(/<section class="recall-quiz"[\s\S]*?<\/section>/g, "");
main = main.replace(/<pre[\s\S]*?<\/pre>/g, "");

const blockRe = /<(p|li|blockquote|h1|h2|h3|h4|dt|dd)[^>]*>([\s\S]*?)<\/\1>/g;
const blocks = [];
let m;
while ((m = blockRe.exec(main))) {
  const text = m[2]
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > 0) blocks.push({ tag: m[1], text });
}

const totalWords = blocks.reduce((n, b) => n + b.text.split(" ").length, 0);
console.log(`[chapter-test] ${CHAPTER}: ${blocks.length} blocks, ${totalWords} words`);

mkdirSync(OUT_DIR, { recursive: true });

console.log("[chapter-test] loading model (cpu)...");
let t0 = Date.now();
const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8", device: "cpu" });
console.log(`[chapter-test] model loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const manifest = [];
const chapterStart = Date.now();
for (const [i, block] of blocks.entries()) {
  const speakable = toSpeakableText(block.text);
  t0 = Date.now();
  const result = await tts.generate(speakable, { voice: VOICE });
  const secs = (Date.now() - t0) / 1000;
  const buf = Buffer.from(await result.toBlob().arrayBuffer());
  const filename = `${String(i).padStart(3, "0")}-${block.tag}.wav`;
  writeFileSync(`${OUT_DIR}/${filename}`, buf);
  manifest.push({ index: i, tag: block.tag, text: block.text, file: filename, genSecs: secs });
  console.log(
    `[chapter-test] ${i + 1}/${blocks.length} [${block.tag}] ${secs.toFixed(1)}s — ${block.text.slice(0, 60)}${block.text.length > 60 ? "…" : ""}`,
  );
}
writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify(manifest, null, 2));

const totalSecs = (Date.now() - chapterStart) / 1000;
const secsPerWord = totalSecs / totalWords;
console.log(
  `[chapter-test] done: ${blocks.length} blocks, ${totalWords} words, ${totalSecs.toFixed(0)}s generation (excl. model load), ${secsPerWord.toFixed(2)}s/word`,
);
