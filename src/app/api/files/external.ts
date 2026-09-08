import path from "path";

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
    .map((r) => path.resolve(r));

/**
 * Resolve an external file path to an absolute path the server may read, or
 * `null` when it is outside every allowed root (or none is configured).
 */
export const resolveExternalPath = (p: unknown): string | null => {
  if (typeof p !== "string" || p.length === 0) return null;
  const resolved = path.resolve(p);
  for (const root of externalRoots()) {
    if (resolved === root || resolved.startsWith(root + path.sep)) return resolved;
  }
  return null;
};
