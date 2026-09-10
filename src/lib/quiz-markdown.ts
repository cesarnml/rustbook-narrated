// Server-only helper (imported from RecallQuiz.astro's frontmatter, never
// shipped to the client): quiz prompt/context text is upstream markdown —
// fenced code, bold/italic, links, lists — not the plain string v1 fed
// straight into `set:html`. `micromark` + the GFM extension are already
// pulled in transitively by Astro's own markdown pipeline; declared as
// direct dependencies in package.json so that stays true on purpose, not
// by accident of some other package's version choice.
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";

export { escapeHtml } from "../scripts/html-escape";

export function renderQuizMarkdown(source: string): string {
	if (!source) return "";
	return micromark(source, {
		extensions: [gfm()],
		htmlExtensions: [gfmHtml()],
	});
}
