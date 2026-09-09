#!/usr/bin/env node
/**
 * Generates the narration track for every page.
 *
 * Input is the built site, not the markdown source: `astro build` wraps each
 * sentence in a `<span data-tts="n">`, and this script reads those spans back
 * out of `dist/`. That means the audio can never drift from what is on the
 * page, and the timing sidecar it writes is indexed by the same `n` the
 * player highlights.
 *
 *   npm run build && npm run narrate
 *
 * Pages are content-hashed, so a second run only re-synthesises what changed.
 *
 * Usage:
 *   node scripts/narrate.mjs [--voice af_heart] [--only <substring>] [--force]
 *
 * Ported from zed-rust-for-dummies's scripts/narrate.mjs. Differences:
 *  - This site's reading order is generated at build time by
 *    scripts/fetch-book.mjs (src/generated/sidebar.json), not a static
 *    sidebar.mjs — read fresh here rather than imported, and the
 *    Start-here/Exercises pages (hardcoded in astro.config.mjs, outside the
 *    generated book sidebar) are appended so they're narratable too.
 *  - No ONNX/Python backend option — this site only ever used kokoro-js.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { fromHtml } from 'hast-util-from-html';
import { visit } from 'unist-util-visit';
import ffmpeg from 'ffmpeg-static';
import { speechOf } from '../src/lib/tts/speech.mjs';
import { tidyForSpeech } from '../src/lib/tts/sentences.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(root, 'dist');
const WORK = path.join(root, '.tts');
const OUT = path.join(root, 'public/audio');

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const VOICE = flag('voice', 'af_heart');
const ONLY = flag('only', null);
const FORCE = has('force');

/** This site's reading order — every page a listener can reach, in sidebar
 * order. `src/generated/sidebar.json` (written by fetch-book.mjs) covers the
 * book; the few pages astro.config.mjs adds around it (Overview, How this
 * site works, Exercises overview) are static and listed here to match. */
function readingOrderKeys() {
  const keys = ['index', 'about'];
  const sidebarPath = path.join(root, 'src/generated/sidebar.json');
  if (fs.existsSync(sidebarPath)) {
    const groups = JSON.parse(fs.readFileSync(sidebarPath, 'utf8'));
    for (const group of groups) {
      for (const item of group.items ?? []) {
        const key = String(item.link ?? '').replace(/^\/|\/$/g, '');
        if (key) keys.push(key);
      }
    }
  }
  keys.push('exercises');
  return new Set(keys);
}

const narratable = readingOrderKeys();

/** Every built page, as `{ key, sentences }`. */
function collectPages() {
  const pages = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'index.html') pages.push(full);
    }
  };
  walk(DIST);

  return pages
    .map((file) => {
      const rel = path.relative(DIST, path.dirname(file));
      const key = rel === '' ? 'index' : rel.split(path.sep).join('/');
      const tree = fromHtml(fs.readFileSync(file, 'utf8'));

      const byIndex = new Map();
      visit(tree, 'element', (node) => {
        const raw = node.properties?.dataTts;
        if (raw === undefined || raw === null) return;
        const i = Number(raw);
        if (Number.isNaN(i) || byIndex.has(i)) return;
        const speech = tidyForSpeech(speechOf(node));
        if (speech) byIndex.set(i, speech);
      });

      const sentences = [...byIndex.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([i, speech]) => ({ i, speech }));
      return { key, sentences };
    })
    .filter((p) => p.sentences.length > 0)
    // The reading order decides what gets a track — narrating a page with no
    // player mounted on it only produces audio nobody can reach.
    .filter((p) => narratable.has(p.key))
    .filter((p) => !ONLY || p.key.includes(ONLY));
}

const hashOf = (page) =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify({ v: 1, voice: VOICE, s: page.sentences }))
    .digest('hex')
    .slice(0, 16);

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${path.basename(cmd)} exited ${code}`)),
    );
  });

async function main() {
  if (!fs.existsSync(DIST)) {
    console.error('No dist/ — run `npm run build` first.');
    process.exit(1);
  }

  const pages = collectPages();
  const stale = pages.filter((page) => {
    if (FORCE) return true;
    const sidecar = path.join(OUT, `${page.key}.json`);
    const audio = path.join(OUT, `${page.key}.mp3`);
    if (!fs.existsSync(sidecar) || !fs.existsSync(audio)) return true;
    try {
      return JSON.parse(fs.readFileSync(sidecar, 'utf8')).hash !== hashOf(page);
    } catch {
      return true;
    }
  });

  const totalChars = pages.reduce(
    (n, p) => n + p.sentences.reduce((m, s) => m + s.speech.length, 0),
    0,
  );
  console.log(
    `${pages.length} pages, ${pages.reduce((n, p) => n + p.sentences.length, 0)} sentences, ` +
      `${totalChars.toLocaleString()} chars`,
  );
  if (stale.length === 0) {
    console.log('Everything is up to date.');
    return;
  }
  console.log(`${stale.length} page(s) to synthesise with ${VOICE} via kokoro-js\n`);

  fs.mkdirSync(WORK, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });

  // Synthesis is the slow part — hours for the whole site — so a run that is
  // interrupted half way must not throw away what it already rendered. Any
  // page with a WAV and a timing file still in the work directory is handed
  // straight to the encoder instead of back to the model.
  const wavDir = path.join(WORK, 'wav');
  const rendered = (page) => {
    const timing = path.join(wavDir, `${page.key}.timing.json`);
    if (!fs.existsSync(path.join(wavDir, `${page.key}.wav`)) || !fs.existsSync(timing)) {
      return false;
    }
    try {
      return JSON.parse(fs.readFileSync(timing, 'utf8')).hash === hashOf(page);
    } catch {
      return false;
    }
  };

  const todo = stale.filter((page) => !rendered(page));
  if (todo.length < stale.length) {
    console.log(`resuming — ${stale.length - todo.length} page(s) already rendered\n`);
  }

  const jobPath = path.join(WORK, 'job.json');
  fs.writeFileSync(
    jobPath,
    JSON.stringify(
      {
        voice: VOICE,
        outDir: wavDir,
        pages: todo.map((page) => ({ ...page, hash: hashOf(page) })),
      },
      null,
      '\t',
    ),
  );

  if (todo.length === 0) {
    console.log('Nothing to synthesise; encoding what is already rendered.\n');
  } else {
    await run(process.execPath, [path.join(root, 'scripts/kokoro_synth.mjs'), jobPath]);
  }

  // Encode each page's WAV to MP3 and write the timing sidecar beside it.
  for (const page of stale) {
    const wav = path.join(WORK, 'wav', `${page.key}.wav`);
    const timing = path.join(WORK, 'wav', `${page.key}.timing.json`);
    if (!fs.existsSync(wav) || !fs.existsSync(timing)) {
      console.warn(`  ! ${page.key} — backend produced no audio, skipping`);
      continue;
    }
    const mp3 = path.join(OUT, `${page.key}.mp3`);
    fs.mkdirSync(path.dirname(mp3), { recursive: true });

    // 48 kbps mono is transparent enough for speech and keeps the whole
    // book's audio a manageable size.
    await run(ffmpeg, [
      '-y', '-loglevel', 'error',
      '-i', wav,
      '-ac', '1', '-ar', '24000', '-b:a', '48k',
      mp3,
    ]);

    const { duration, sentences } = JSON.parse(fs.readFileSync(timing, 'utf8'));
    fs.writeFileSync(
      path.join(OUT, `${page.key}.json`),
      JSON.stringify({
        key: page.key,
        voice: VOICE,
        hash: hashOf(page),
        duration,
        sentences,
      }),
    );
    const kb = (fs.statSync(mp3).size / 1024).toFixed(0);
    console.log(`  ✓ ${page.key.padEnd(34)} ${duration.toFixed(0)}s  ${kb} KB`);
  }

  console.log('\nDone. Re-run `npm run build` to publish the audio.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
