// Server-only helper (imported from RecallQuiz.astro's frontmatter, never
// shipped to the client): quiz prompt/context text is upstream markdown —
// fenced code, bold/italic, links, lists — not the plain string v1 fed
// straight into `set:html`. `micromark` + the GFM extension are already
// pulled in transitively by Astro's own markdown pipeline; declared as
// direct dependencies in package.json so that stays true on purpose, not
// by accident of some other package's version choice.
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

export function renderQuizMarkdown(source: string): string {
	if (!source) return "";
	return micromark(source, {
		extensions: [gfm()],
		htmlExtensions: [gfmHtml()],
	});
}

/** Escapes text for use inside HTML, attributes included — for the Tracing code block (not markdown) and any raw rustc output interpolated into the client script's feedback templates. */
export function escapeHtml(source: string): string {
	return source
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
