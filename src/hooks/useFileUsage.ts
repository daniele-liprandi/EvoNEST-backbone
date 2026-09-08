// Uses the global SWRConfig fetcher (src/lib/swr-fetcher.ts), which throws on a
// non-OK response so the error reflects a failed request instead of resolving
// with the error body as data.
import useSWR from "swr";
import { prepend_path } from "@/lib/utils";

export interface FileUsage {
  /** Bytes held in the NEST's GridFS bucket. */
  gridfsBytes: number;
  /** How many `files` rows are external links. */
  externalCount: number;
  /** Total `files` rows. */
  fileCount: number;
}

export const useFileUsage = () => {
  const { data, error, isLoading, mutate } = useSWR<FileUsage>(
    `${prepend_path}/api/files/usage`,
  );
  return {
    usage: data,
    usageError: error,
    usageLoading: isLoading,
    mutateUsage: mutate,
  };
};

const UNITS = ["B", "KB", "MB", "GB", "TB"];

/** Human-readable byte size, e.g. `12.4 GB`. */
export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes < 1) return "0 B";
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value.toFixed(value < 10 && exp > 0 ? 1 : 0)} ${UNITS[exp]}`;
};

/** Soft ceiling for managed storage — the meter nudges toward external links past this. */
export const MANAGED_STORAGE_SOFT_LIMIT = 15 * 1024 ** 3;
