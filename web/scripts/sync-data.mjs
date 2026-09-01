// Copies the pipeline's committed output (../data) into public/data so it can
// be read at build time (generateStaticParams, server components) and fetched
// client-side (/data/...) without depending on Python at deploy time.
// Run automatically via the `predev`/`prebuild` npm scripts.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "..", "..", "data");
const dest = path.resolve(here, "..", "public", "data");

if (!existsSync(src)) {
  console.error(`[sync-data] source not found: ${src}. Run pipeline/build.py first.`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

for (const f of ["index.json", "meta.json"]) {
  cpSync(path.join(src, f), path.join(dest, f));
}
cpSync(path.join(src, "planets"), path.join(dest, "planets"), { recursive: true });

console.log(`[sync-data] synced index.json, meta.json, planets/* -> ${dest}`);
