// Bundles the narrator into a single browser-ready ES module. Run from
// CI (see .github/workflows/deploy.yml) right before `mdbook build`, so
// the output can be copied into the book's theme directory.
import { build } from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["src/kokoro-reader.js"],
  bundle: true,
  format: "esm",
  target: "es2022",
  platform: "browser",
  minify: true,
  sourcemap: true,
  outfile: "dist/narrator.bundle.js",
});

console.log("Built dist/narrator.bundle.js");
