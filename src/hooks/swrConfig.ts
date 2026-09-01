/**
 * Shared SWR options for the entity tables. The lists are large and change
 * rarely within a session, so we do not revalidate on focus or on mount when
 * the cache is warm, we keep the previous page visible while refetching, and we
 * dedupe repeat requests for an hour. Pass extra options by spreading this.
 */
export const tableSwrConfig = {
  revalidateIfStale: false,
  revalidateOnFocus: false,
  keepPreviousData: true,
  dedupingInterval: 3_600_000,
} as const;
