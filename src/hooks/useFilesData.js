// useFilesData.js
// Uses the global SWRConfig fetcher (src/app/providers/swr-provider.tsx), which
// throws on a non-OK response so `filesError` actually reflects a failed
// request instead of resolving with the error body as if it were data.
import useSWR from 'swr';

export const useFilesData = (prependPath) => {
    // GET /api/files is paginated ({ files, nextCursor }); the only consumer is
    // the dashboard marquee, so a single generous page is enough.
    const { data, error } = useSWR(`${prependPath}/api/files?limit=200`);
    return {
        filesData: data?.files,
        filesError: error,
    };
};
