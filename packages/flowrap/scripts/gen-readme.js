// The npm page reads its README from the TARBALL, not from the repo root —
// there is no fallback. So the package needs its own copy, and a hand-written
// one drifts: this file sat on v0.1.0, claiming there were no edges, long
// after edges and ports shipped.
//
// Hence: generate it. The root README stays the single source of truth, this
// script picks the sections that earn their place on a landing page, and the
// result is gitignored so nobody can "fix" it by hand.
import { readFileSync, writeFileSync } from 'node:fs';

// No `repository` field to read it from yet. Update both if the repo moves.
const REPO = 'https://github.com/DenjiTensAI/flowrap';
const BLOB = `${REPO}/blob/main/`;

/** Sections kept, in the root README's own order. The rest lives on GitHub. */
const KEEP = new Set(['Quick start', 'Your data', 'API', 'Styling', 'License']);

const ROOT = new URL('../../../README.md', import.meta.url);
const OUT = new URL('../README.md', import.meta.url);

const src = readFileSync(ROOT, 'utf8');

// Split on level-2 headings; everything before the first one is the preamble
// (hero image, tagline, the pitch). `###` stays inside its parent section.
const parts = src.split(/^## (?=\S)/m);
const preamble = parts.shift();

const kept = parts
  .map((block) => {
    const title = block.slice(0, block.indexOf('\n')).trim();
    return KEEP.has(title) ? `## ${block}` : null;
  })
  .filter(Boolean);

const missing = [...KEEP].filter(
  (t) => !kept.some((b) => b.startsWith(`## ${t}\n`))
);
if (missing.length > 0) {
  // A renamed heading in the root README would silently drop a whole section.
  throw new Error(`gen-readme: section(s) not found in root README: ${missing.join(', ')}`);
}

const banner = `> **📖 Full documentation, more examples and the contributing guide:**
> [github.com/DenjiTensAI/flowrap](${REPO})

`;

let out = preamble + banner + kept.join('');

// Relative links point at repository files that aren't in the tarball — on the
// npm page they lead nowhere. Absolute ones work in both places.
out = out.replace(/\]\((?!https?:|#|mailto:)([^)]+)\)/g, (_, path) => `](${BLOB}${path})`);

writeFileSync(OUT, out);

const lines = out.split('\n').length;
console.log(`gen-readme: ${kept.length} section(s), ${lines} lines -> packages/flowrap/README.md`);
