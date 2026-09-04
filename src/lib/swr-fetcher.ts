/**
 * The one SWR fetcher for the app. It throws on a non-OK response so `error`
 * from `useSWR` reflects a failed request; a bare `fetch(url).then(r => r.json())`
 * instead resolves with the error body as if it were data, which silently turns
 * a 401/403/500 into "the field is just missing" at the call site.
 *
 * `SWRConfig` in `swr-provider.tsx` installs this as the default, so a hook that
 * passes no fetcher already gets it. Import it directly only where you can't rely
 * on that context: an explicit fetcher argument, or `preload()`.
 */

export interface FetchError extends Error {
  status?: number;
  /** The parsed error body, when the response had one. */
  info?: unknown;
}

export const swrFetcher = async <T = unknown>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const error: FetchError = new Error("An error occurred while fetching the data.");
    error.status = res.status;
    error.info = await res.json().catch(() => undefined);
    throw error;
  }
  return res.json() as Promise<T>;
};
