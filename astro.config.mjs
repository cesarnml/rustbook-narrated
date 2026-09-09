import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { readFileSync, existsSync } from "node:fs";

// scripts/fetch-book.mjs writes this at build/dev time (npm's "prebuild"
// hook, or "npm run dev"). It never exists in git — see .gitignore — so a
// checkout with no book fetched yet still has *some* sidebar to render.
const sidebarPath = new URL("./src/generated/sidebar.json", import.meta.url);
const bookSidebar = existsSync(sidebarPath)
  ? JSON.parse(readFileSync(sidebarPath, "utf8"))
  : [{ label: "Book (run `npm run fetch-book` first)", items: [] }];

export default defineConfig({
  site: "https://therustbooknowwithniceaudio.vercel.app",
  integrations: [
    starlight({
      title: "The Rust Book, Narrated",
      description:
        "The Rust Programming Language (Brown CS quizzed edition) with a browser-side Kokoro narrator and hands-on per-chapter exercises.",
      social: {
        github: "https://github.com/cesarnml/rustbook-narrated",
      },
      customCss: ["./src/styles/narrator.css"],
      components: {
        // Injects the narrator toolbar + recall quiz below every page's content.
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
