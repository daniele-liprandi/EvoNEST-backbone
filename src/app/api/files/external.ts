import path from "path";
import { realpathSync } from "fs";

/**
 * Canonicalise a path: resolve symlinks as far as the path exists, then
 * re-append the not-yet-existing tail. So a real directory reached through a
 * symlink (macOS `/var` -> `/private/var`) and a symlink *inside* the path both
 * collapse to their true location, while a path to a file that does not exist
 * yet still canonicalises via its nearest existing ancestor.
 */
const canonical = (p: string): string => {
  try {
    return realpathSync(p);
  } catch {
    const parent = path.dirname(p);
    if (parent === p) return p;
    return path.join(canonical(parent), path.basename(p));
  }
};

/**
 * Filesystem roots the server is allowed to read external files from — the
 * `EXTERNAL_FILE_ROOTS` list (delimited like `PATH`) plus `STORAGE_PATH`. An
 * external path outside every root is treated as "not reachable from the
 * server": links still hold, but streaming and importing return 409 and the UI
 * shows the path as copyable text.
 */
const externalRoots = (): string[] =>
  [process.env.EXTERNAL_FILE_ROOTS, process.env.STORAGE_PATH]
    .filter((v): v is string => typeof v === "string" && v.length > 0)
    .join(path.delimiter)
    .split(path.delimiter)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => canonical(path.resolve(r)));

const isUnder = (candidate: string, roots: string[]) =>
  roots.some((root) => candidate === root || candidate.startsWith(root + path.sep));

/**
 * Resolve an external file path to an absolute path the server may read, or
 * `null` when it is outside every allowed root (or none is configured). The
 * path is canonicalised first, so a symlink planted inside a root cannot point
 * the reader outside it.
 */
export const resolveExternalPath = (p: unknown): string | null => {
  if (typeof p !== "string" || p.length === 0) return null;
  const resolved = path.resolve(p);
  return isUnder(canonical(resolved), externalRoots()) ? resolved : null;
};
