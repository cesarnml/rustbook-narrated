/**
 * Per-chapter reading progress, shared between Narration.astro, RecallQuiz.astro
 * and Sidebar.astro. Lives in localStorage under `progress:<slug>`, where
 * `slug` is the book-chapter slug (e.g. `ch04-01-what-is-ownership` — no
 * `book/` prefix, matching RecallQuiz's own `slug` prop, *not* Narration's
 * `key` which is the full URL path). Narration.astro strips its own prefix
 * before calling in.
 *
 * Two independent signals feed the sidebar checkmark:
 * - `audio`: "started" once played, "done" at >=90% or on natural end.
 * - `quiz`: "started" once any question is touched, "done" once every
 *   question has a recorded outcome (answered, revealed, or skipped) —
 *   completion, not correctness; see RecallQuiz.astro.
 *
 * Sidebar.astro derives a green/yellow/none badge from these plus whether
 * the page has a quiz at all (see `statusFor`).
 */

export interface QuizAnswerState {
	status: "correct" | "wrong" | "revealed" | "skipped";
	/** What the reader last entered/picked, so a reload can restore the UI. */
	value?: string | string[];
}

export interface PageProgress {
	audio?: "started" | "done";
	quiz?: "started" | "done";
	answers?: Record<string, QuizAnswerState>;
}

const KEY_PREFIX = "progress:";
const EVENT = "pc:progress-changed";

function read(slug: string): PageProgress {
	try {
		const raw = localStorage.getItem(KEY_PREFIX + slug);
		return raw ? (JSON.parse(raw) as PageProgress) : {};
	} catch {
		return {};
	}
}

function write(slug: string, next: PageProgress) {
	try {
		localStorage.setItem(KEY_PREFIX + slug, JSON.stringify(next));
	} catch {
		// localStorage unavailable (private browsing, storage full, etc.) —
		// progress just won't persist; nothing else here depends on it.
		return;
	}
	dispatchEvent(new CustomEvent<{ slug: string; progress: PageProgress }>(EVENT, { detail: { slug, progress: next } }));
}

export function getProgress(slug: string): PageProgress {
	return read(slug);
}

export function markAudioStarted(slug: string) {
	const current = read(slug);
	if (current.audio) return;
	write(slug, { ...current, audio: "started" });
}

export function markAudioDone(slug: string) {
	const current = read(slug);
	if (current.audio === "done") return;
	write(slug, { ...current, audio: "done" });
}

export function markQuizStarted(slug: string) {
	const current = read(slug);
	if (current.quiz) return;
	write(slug, { ...current, quiz: "started" });
}

/** Records one question's outcome and recomputes whether the whole quiz is done. */
export function recordAnswer(slug: string, questionId: string, state: QuizAnswerState, totalQuestions: number) {
	const current = read(slug);
	const answers = { ...(current.answers ?? {}), [questionId]: state };
	const done = Object.keys(answers).length >= totalQuestions;
	write(slug, { ...current, quiz: done ? "done" : "started", answers });
}

/** "done" = fully complete for whatever this page has; "started" = touched, not done; "none" = untouched. */
export function statusFor(slug: string, hasQuiz: boolean): "done" | "started" | "none" {
	const p = read(slug);
	if (hasQuiz) {
		if (p.quiz === "done") return "done";
	} else if (p.audio === "done") {
		return "done";
	}
	if (p.quiz === "started" || p.quiz === "done" || p.audio === "started" || p.audio === "done") {
		return "started";
	}
	return "none";
}

export function onProgressChanged(handler: (detail: { slug: string; progress: PageProgress }) => void) {
	addEventListener(EVENT, (event) => handler((event as CustomEvent).detail));
}
