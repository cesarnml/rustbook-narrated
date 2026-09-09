import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { readFileSync, existsSync } from "node:fs";
import rehypeTts from "./src/plugins/rehype-tts.mjs";

// scripts/fetch-book.mjs writes this at build/dev time (npm's "prebuild"
// hook, or "npm run dev"). It never exists in git — see .gitignore — so a
// checkout with no book fetched yet still has *some* sidebar to render.
const sidebarPath = new URL("./src/generated/sidebar.json", import.meta.url);
const bookSidebar = existsSync(sidebarPath)
  ? JSON.parse(readFileSync(sidebarPath, "utf8"))
  : [{ label: "Book (run `npm run fetch-book` first)", items: [] }];

export default defineConfig({
  site: "https://therustbooknowwithniceaudio.vercel.app",
  markdown: {
    // Wraps each sentence in a `<span data-tts="n">`. scripts/narrate.mjs
    // reads those spans back out of `dist/`, so `astro build` has to run
    // before audio can be generated. See src/plugins/rehype-tts.mjs.
    rehypePlugins: [rehypeTts],
  },
  integrations: [
    starlight({
      title: "The Rust Book, Narrated",
      description:
        "The Rust Programming Language (Brown CS quizzed edition) with a pregenerated Kokoro narration track and hands-on per-chapter exercises.",
      social: {
        github: "https://github.com/cesarnml/rustbook-narrated",
      },
      components: {
        // Injects the narration player + recall quiz below every page's content.
        Footer: "./src/components/NarratorPageFrame.astro",
      },
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "Overview", link: "/" },
            { label: "How this site works", link: "/about/" },
          ],
        },
        ...bookSidebar,
        {
          label: "Exercises",
          items: [{ label: "Overview", link: "/exercises/" }],
        },
      ],
    }),
  ],
});
