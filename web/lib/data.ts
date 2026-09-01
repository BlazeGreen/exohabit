// Server-side data access. Reads the JSON synced into public/data by
// scripts/sync-data.mjs (see package.json predev/prebuild). Cached in-process
// so repeated calls during a single build/request don't re-read from disk.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { IndexRow, Meta, Planet } from "./types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

let _index: IndexRow[] | null = null;
let _meta: Meta | null = null;
const _planetCache = new Map<string, Planet>();

export function getIndex(): IndexRow[] {
  if (!_index) {
    _index = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "index.json"), "utf8"));
  }
  return _index!;
}

export function getMeta(): Meta {
  if (!_meta) {
    _meta = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "meta.json"), "utf8"));
  }
  return _meta!;
}

export function getPlanet(id: string): Planet | null {
  if (_planetCache.has(id)) return _planetCache.get(id)!;
  const p = path.join(DATA_DIR, "planets", `${id}.json`);
  if (!fs.existsSync(p)) return null;
  const planet: Planet = JSON.parse(fs.readFileSync(p, "utf8"));
  _planetCache.set(id, planet);
  return planet;
}

export function getAllPlanetIds(): string[] {
  return fs
    .readdirSync(path.join(DATA_DIR, "planets"))
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -5));
}

/** Ids pre-rendered at build time (top-N by score); the rest render on first
 * request and are cached (dynamicParams=true in the pages that use this). */
export function getStaticPlanetIds(limit = 300): string[] {
  return getIndex()
    .slice(0, limit)
    .map((p) => p.id);
}
