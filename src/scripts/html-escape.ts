/**
 * Escapes text for use inside HTML, attributes included. Split out into its
 * own module (no other imports) so it's cheap to pull into the client
 * `<script>` in RecallQuiz.astro as well as src/lib/quiz-markdown.ts's
 * server-side helper (which re-exports it) — one implementation instead of
 * two independently maintained copies.
 */
export function escapeHtml(source: string): string {
	return source
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
