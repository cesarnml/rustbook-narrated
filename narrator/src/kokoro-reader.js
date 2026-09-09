// "Listen" mode: plays pregenerated Kokoro TTS audio for the current page,
// block by block. Audio is generated build-time/offline on a real machine
// (see ../generate-audio.mjs) and shipped as static files under
// /audio/<hash>.<ext>, keyed by a hash of each block's speakable text — so
// a block whose upstream text hasn't changed always resolves to the same
// file, and a block that HAS changed (or was never generated) just has no
// match. There is no in-browser generation fallback: a miss means that one
// block is silently skipped, not synthesized live.
//
// Injected into every page via the PageFrame Starlight component override
// (see src/components/NarratorPageFrame.astro).

import { toSpeakableText } from "./preprocess.js";

const AUDIO_EXT = "mp3";
const READABLE_SELECTOR = "p, li, blockquote, h1, h2, h3, h4, dt, dd";
// .recall-quiz is this repo's own quiz UI (src/components/RecallQuiz.astro) —
// its question/feedback text isn't book prose and was never pregenerated.
const SKIP_SELECTOR = "pre, .recall-quiz, script, style, nav, .sidebar, #narrator-bar";

let queue = [];
let queueIndex = -1;
let playing = false;
let currentAudio = null;
let hashCache = new WeakMap();

function findContentRoot() {
  return document.querySelector("#content main") || document.querySelector("main") || document.body;
}

function collectBlocks() {
  const root = findContentRoot();
  const skip = new Set();
  root.querySelectorAll(SKIP_SELECTOR).forEach((el) => {
    el.querySelectorAll("*").forEach((child) => skip.add(child));
    skip.add(el);
  });

  return Array.from(root.querySelectorAll(READABLE_SELECTOR)).filter((el) => {
    if (skip.has(el)) return false;
    if (el.closest(SKIP_SELECTOR)) return false;
    const text = el.textContent.trim();
    return text.length > 0;
  });
}

function setStatus(text) {
  const el = document.getElementById("narrator-status");
  if (el) el.textContent = text;
}

function clearHighlight() {
  document.querySelectorAll(".narrator-active-block").forEach((el) => el.classList.remove("narrator-active-block"));
}

function highlight(el) {
  clearHighlight();
  el.classList.add("narrator-active-block");
  el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function getSetting(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function setSetting(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore (private browsing, quota, etc.) */
  }
}

// Same hash a block's precomputed file is named after — see
// ../generate-audio.mjs's hashText(). SHA-1 of the speakable (post
// pronunciation-dictionary/heteronym) text is plenty for content-addressing
// here; this isn't a security boundary.
async function hashFor(el) {
  if (hashCache.has(el)) return hashCache.get(el);
  const speakable = toSpeakableText(el.textContent.trim());
  const bytes = new TextEncoder().encode(speakable);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  hashCache.set(el, hash);
  return hash;
}

async function playBlock(el) {
  const hash = await hashFor(el);
  const url = `/audio/${hash}.${AUDIO_EXT}`;

  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.playbackRate = Number(getSetting("narrator-speed", "1"));
    currentAudio = audio;
    audio.onended = () => resolve();
    audio.onerror = () => {
      // No pregenerated audio for this block (never generated, or upstream
      // text changed since the last generation run) — skip it silently
      // rather than falling back to live generation.
      console.warn(`[narrator] no audio for block (${url}), skipping`);
      resolve();
    };
    audio.play().catch(() => resolve());
  });
}

async function playFrom(index) {
  playing = true;
  updatePlayButton();
  for (queueIndex = index; queueIndex < queue.length && playing; queueIndex++) {
    const el = queue[queueIndex];
    highlight(el);
    setStatus(`Reading ${queueIndex + 1} / ${queue.length}`);
    await playBlock(el);
    if (!playing) break;
  }
  if (queueIndex >= queue.length) {
    setStatus("Done");
    clearHighlight();
  }
  playing = false;
  updatePlayButton();
}

function stop() {
  playing = false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  clearHighlight();
  setStatus("Stopped");
  updatePlayButton();
}

function updatePlayButton() {
  const btn = document.getElementById("narrator-play");
  if (btn) btn.textContent = playing ? "⏸" : "▶";
}

function buildToolbar() {
  const bar = document.createElement("div");
  bar.id = "narrator-bar";

  const playBtn = document.createElement("button");
  playBtn.id = "narrator-play";
  playBtn.title = "Listen to this page";
  playBtn.textContent = "▶";
  playBtn.addEventListener("click", async () => {
    if (playing) {
      stop();
      return;
    }
    queue = collectBlocks();
    if (queue.length === 0) {
      setStatus("Nothing to read here");
      return;
    }
    const startAt = queueIndex >= 0 && queueIndex < queue.length ? queueIndex : 0;
    await playFrom(startAt);
  });

  const stopBtn = document.createElement("button");
  stopBtn.title = "Stop";
  stopBtn.textContent = "⏹";
  stopBtn.addEventListener("click", stop);

  const prevBtn = document.createElement("button");
  prevBtn.title = "Previous paragraph";
  prevBtn.textContent = "⏮";
  prevBtn.addEventListener("click", () => {
    if (queue.length === 0) queue = collectBlocks();
    stop();
    playFrom(Math.max(0, queueIndex - 1));
  });

  const nextBtn = document.createElement("button");
  nextBtn.title = "Next paragraph";
  nextBtn.textContent = "⏭";
  nextBtn.addEventListener("click", () => {
    if (queue.length === 0) queue = collectBlocks();
    stop();
    playFrom(Math.min(queue.length - 1, queueIndex + 1));
  });

  const speedSelect = document.createElement("select");
  speedSelect.title = "Speed";
  for (const speed of ["0.75", "1", "1.25", "1.5"]) {
    const opt = document.createElement("option");
    opt.value = speed;
    opt.textContent = `${speed}×`;
    speedSelect.appendChild(opt);
  }
  speedSelect.value = getSetting("narrator-speed", "1");
  speedSelect.addEventListener("change", () => {
    setSetting("narrator-speed", speedSelect.value);
    if (currentAudio) currentAudio.playbackRate = Number(speedSelect.value);
  });

  const status = document.createElement("span");
  status.id = "narrator-status";
  status.textContent = "Listen";

  bar.append(prevBtn, playBtn, nextBtn, stopBtn, speedSelect, status);
  document.body.appendChild(bar);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildToolbar);
  } else {
    buildToolbar();
  }
}
