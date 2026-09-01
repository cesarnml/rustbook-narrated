// "Listen" mode: reads the current mdBook page aloud with Kokoro TTS,
// running entirely in the browser (WASM/WebGPU — nothing is sent to a
// server). Injected into every page via book.toml's `additional-js`
// (see scripts/patch-book-toml.mjs).
//
// Kokoro and its ~80MB model are only fetched the first time someone
// presses Play, and are cached by the browser afterwards.

import { toSpeakableText } from "./preprocess.js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const DEFAULT_VOICE = "af_heart";
const VOICES = [
  ["af_heart", "Heart (US, warm)"],
  ["af_bella", "Bella (US)"],
  ["am_michael", "Michael (US)"],
  ["bf_emma", "Emma (UK)"],
  ["bm_george", "George (UK)"],
];

const READABLE_SELECTOR = "p, li, blockquote, h1, h2, h3, h4, dt, dd";
const SKIP_SELECTOR = "pre, .mdbook-quiz, script, style, nav, .sidebar";

let tts = null;
let loadingPromise = null;
let queue = [];
let queueIndex = -1;
let playing = false;
let currentAudio = null;

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

async function ensureModel() {
  if (tts) return tts;
  if (loadingPromise) return loadingPromise;

  setStatus("Loading voice…");
  loadingPromise = (async () => {
    const { KokoroTTS } = await import("kokoro-js");
    const device = "webgpu" in navigator ? "webgpu" : "wasm";
    tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8", device });
    return tts;
  })();

  try {
    return await loadingPromise;
  } catch (err) {
    loadingPromise = null;
    setStatus("Voice failed to load");
    console.error("[narrator] failed to load Kokoro:", err);
    throw err;
  }
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

async function speakBlock(el) {
  const model = await ensureModel();
  const speakable = toSpeakableText(el.textContent.trim());
  const voice = getSetting("narrator-voice", DEFAULT_VOICE);
  const speed = Number(getSetting("narrator-speed", "1"));

  const result = await model.generate(speakable, { voice, speed });
  const blob = typeof result.toBlob === "function" ? result.toBlob() : result;
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    audio.play().catch(reject);
  });
}

async function playFrom(index) {
  playing = true;
  updatePlayButton();
  for (queueIndex = index; queueIndex < queue.length && playing; queueIndex++) {
    const el = queue[queueIndex];
    highlight(el);
    setStatus(`Reading ${queueIndex + 1} / ${queue.length}`);
    try {
      await speakBlock(el);
    } catch (err) {
      console.error("[narrator] playback error:", err);
      setStatus("Playback error — see console");
      break;
    }
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

  const voiceSelect = document.createElement("select");
  voiceSelect.title = "Voice";
  for (const [value, label] of VOICES) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    voiceSelect.appendChild(opt);
  }
  voiceSelect.value = getSetting("narrator-voice", DEFAULT_VOICE);
  voiceSelect.addEventListener("change", () => setSetting("narrator-voice", voiceSelect.value));

  const speedSelect = document.createElement("select");
  speedSelect.title = "Speed";
  for (const speed of ["0.75", "1", "1.25", "1.5"]) {
    const opt = document.createElement("option");
    opt.value = speed;
    opt.textContent = `${speed}×`;
    speedSelect.appendChild(opt);
  }
  speedSelect.value = getSetting("narrator-speed", "1");
  speedSelect.addEventListener("change", () => setSetting("narrator-speed", speedSelect.value));

  const status = document.createElement("span");
  status.id = "narrator-status";
  status.textContent = "Listen";

  bar.append(prevBtn, playBtn, nextBtn, stopBtn, voiceSelect, speedSelect, status);
  document.body.appendChild(bar);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildToolbar);
  } else {
    buildToolbar();
  }
}
