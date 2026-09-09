// Takes one chapter-test run's output (numbered .wav + manifest.json from
// generate-chapter-test.mjs), transcodes each block to mp3 (ffmpeg/lame,
// ~48kbps mono — spoken word, not music), and publishes it under
// public/audio/<hash>.mp3, hashed the same way the client does (sha1 of
// toSpeakableText(text)) so kokoro-reader.js's runtime lookup finds it.
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { toSpeakableText } from "./src/preprocess.js";

const CHAPTER = process.argv[2] ?? "ch04-01-what-is-ownership";
const SRC_DIR = `../.audio-test/${CHAPTER}`;
const OUT_DIR = "../public/audio";

const manifest = JSON.parse(readFileSync(`${SRC_DIR}/manifest.json`, "utf8"));
mkdirSync(OUT_DIR, { recursive: true });

let published = 0;
let totalWavBytes = 0;
let totalMp3Bytes = 0;
for (const block of manifest) {
  const speakable = toSpeakableText(block.text);
  const hash = createHash("sha1").update(speakable).digest("hex");
  const src = `${SRC_DIR}/${block.file}`;
  const dest = `${OUT_DIR}/${hash}.mp3`;
  const result = spawnSync("ffmpeg", ["-y", "-i", src, "-codec:a", "libmp3lame", "-b:a", "48k", "-ac", "1", dest], {
    stdio: ["ignore", "ignore", "pipe"],
  });
  if (result.status !== 0) {
    console.error(`[publish-chapter] ffmpeg failed on ${block.file}:`, result.stderr?.toString());
    continue;
  }
  totalWavBytes += readFileSync(src).length;
  totalMp3Bytes += readFileSync(dest).length;
  published++;
}
const savedPct = totalWavBytes > 0 ? (100 * (1 - totalMp3Bytes / totalWavBytes)).toFixed(0) : 0;
console.log(
  `[publish-chapter] ${CHAPTER}: published ${published}/${manifest.length} blocks — ${(totalWavBytes / 1e6).toFixed(1)}MB wav -> ${(totalMp3Bytes / 1e6).toFixed(1)}MB mp3 (${savedPct}% smaller)`,
);
