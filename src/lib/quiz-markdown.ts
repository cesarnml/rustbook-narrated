// Server-only helper (imported from RecallQuiz.astro's frontmatter, never
// shipped to the client): quiz prompt/context text is upstream markdown —
// fenced code, bold/italic, links, lists — not the plain string v1 fed
// straight into `set:html`. `micromark` + the GFM extension are already
// pulled in transitively by Astro's own markdown pipeline; declared as
// direct dependencies in package.json so that stays true on purpose, not
// by accident of some other package's version choice.
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
import { createCssVariablesTheme, getSingletonHighlighter, type HighlighterGeneric } from "shiki";
import { escapeHtml } from "../scripts/html-escape";

export type QuizHighlighter = HighlighterGeneric<never, never>;

// Shiki is already a transitive dependency (Astro/Starlight's own markdown
// pipeline uses it for every code block in the book's prose) but the quiz
// never went through that pipeline — it's rendered from structured JSON in
// this component's own frontmatter, not a .md file, so it got no
// highlighting at all until now. `css-variables` with this exact prefix is
// the theme Astro itself renders with (confirmed against the built site's
// own CSS: --astro-code-token-keyword and friends are already defined
// globally, mapped onto this site's --sl-color-* tokens) — using the same
// theme+prefix here means quiz code matches the surrounding prose's colors,
// in both light and dark, with zero new CSS of our own.
export const QUIZ_THEME_NAME = "quiz-css-vars";
const theme = createCssVariablesTheme({
	name: QUIZ_THEME_NAME,
	variablePrefix: "--astro-code-",
	variableDefaults: {},
	fontStyle: true,
});

let highlighterPromise: Promise<QuizHighlighter> | null = null;
/** Shiki's own instance cache (getSingletonHighlighter) already makes this cheap to call repeatedly across the many pages one `astro build` renders — this just adds the one-time lang/theme load. */
export function quizHighlighter(): Promise<QuizHighlighter> {
	highlighterPromise ??= getSingletonHighlighter({ langs: ["rust", "toml", "text"], themes: [theme] });
	return highlighterPromise;
}

// Fence tags actually present in this dataset (checked against every quiz
// file): "" (bare ``` — always real Rust here), "rust", "toml", "text" (a
// captured rustc error/terminal transcript, correctly left unhighlighted —
// coloring it as Rust would mislabel prose as syntax), and "ide" (Brown
// CS's own tag for a snippet meant to look like an IDE pane; the content is
// plain Rust, just not tagged as such upstream).
function resolveLang(lang: string): string {
	if (lang === "ide" || lang === "") return "rust";
	return lang;
}

/** Renders one line of a Tracing program as highlighted token spans — kept separate from the fenced-code path below because RecallQuiz.astro wraps each line in its own clickable gutter element (the "which line fails" answer), which Shiki's own `codeToHtml` output has no hook for. */
export function highlightLines(hl: QuizHighlighter, program: string): string[] {
	const tokenLines = hl.codeToTokensBase(program, { lang: "rust", theme: QUIZ_THEME_NAME });
	return tokenLines.map((tokens) => {
		const html = tokens.map((t) => `<span style="color:${t.color}">${escapeHtml(t.content)}</span>`).join("");
		return html || " ";
	});
}

const FENCE_RE = /```(\w*)\n([\s\S]*?)```/g;
// A placeholder needs to survive a round-trip through micromark (so no
// markdown-significant characters) — tried a NUL byte first, which this
// environment's own file-write path silently strips on save, so this
// bracket form instead.
const placeholder = (i: number) => `⟦QUIZCODE${i}⟧`;
const placeholderPattern = /⟦QUIZCODE(\d+)⟧/g;

export function renderQuizMarkdown(source: string, hl: QuizHighlighter): string {
	if (!source) return "";
	// Pull fenced code out before micromark ever sees it, highlight it with
	// Shiki, splice the result back in afterward — micromark's own fenced-
	// code rendering is plain <pre><code>, with no hook for per-token color.
	const blocks: string[] = [];
	const withPlaceholders = source.replace(FENCE_RE, (_, lang: string, code: string) => {
		const html = hl.codeToHtml(code.replace(/\n$/, ""), { lang: resolveLang(lang), theme: QUIZ_THEME_NAME });
		blocks.push(html);
		return placeholder(blocks.length - 1);
	});
	let html = micromark(withPlaceholders, {
		extensions: [gfm()],
		htmlExtensions: [gfmHtml()],
	});
	// A fence that was its own paragraph (the common case — several quiz
	// choices in this dataset are *entirely* one code block) comes back
	// wrapped in a <p>; unwrap so the block-level <pre> isn't nested inside
	// one. Anything left over (a fence micromark placed somewhere else,
	// e.g. inside a list item) still gets swapped in-place as a fallback.
	html = html.replace(new RegExp(`<p>${placeholderPattern.source}</p>`, "g"), (_, i: string) => blocks[Number(i)]!);
	html = html.replace(placeholderPattern, (_, i: string) => blocks[Number(i)]!);
	return html;
}
