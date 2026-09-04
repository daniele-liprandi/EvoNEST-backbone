// useDatabases.js
// Uses the global SWRConfig fetcher (src/lib/swr-fetcher.ts), which throws on a
// non-OK response so `databasesError` reflects a failed request instead of
// resolving with the error body as if it were data.
import useSWR from 'swr';

export const useDatabases = () => {
    const { data, error, mutate } = useSWR('/api/databases', {
        revalidateOnFocus: false,
        dedupingInterval: 300000, // 5 minutes
    });

    return {
        databases: data?.databases || [],
        databasesError: error,
        isDatabasesLoading: !error && !data,
        mutateDatabases: mutate
    };
};
