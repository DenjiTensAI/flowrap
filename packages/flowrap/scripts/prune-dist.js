// svelte-package copies EVERYTHING from src/lib, tests and harnesses
// included, and has no exclude option. There's no reason to ship them:
// harnesses exist only for the component tests and would drag extra
// public API along with them.
import { readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const DROP = /(\.test\.|\.spec\.|\.harness\.svelte)/;

let removed = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (DROP.test(entry)) {
      rmSync(full);
      removed++;
    }
  }
}

walk(DIST);
console.log(`prune-dist: removed ${removed} test/harness file(s) from dist`);
