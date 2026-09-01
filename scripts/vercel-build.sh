#!/usr/bin/env bash
# Vercel build entrypoint (see vercel.json). Vercel's build image doesn't
# ship Rust, so this installs a minimal toolchain, builds the book exactly
# the way .github/workflows/deploy.yml does for GitHub Pages, and leaves
# the finished static site at book/book (vercel.json's outputDirectory).
set -euo pipefail

export PATH="$HOME/.cargo/bin:$PATH"

if ! command -v cargo >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
fi

cargo install mdbook --locked
cargo install mdbook-quiz --locked
npm install -g pnpm@8

git clone --depth 1 https://github.com/cognitive-engineering-lab/rust-book.git book
echo "book_commit=$(git -C book rev-parse HEAD)"

(cd book/js-extensions && pnpm install --frozen-lockfile && pnpm build)

(cd narrator && npm install && npm test && npm run build)

cp narrator/dist/narrator.bundle.js book/narrator.bundle.js
cp narrator/src/narrator.css book/narrator.css
node scripts/patch-book-toml.mjs book/book.toml

(cd book && mdbook build)
