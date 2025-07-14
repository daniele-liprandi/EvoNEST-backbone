// useDatabases.js
import useSWR from 'swr';

const fetcher = url => fetch(url).then(res => res.json());

export const useDatabases = () => {
    const { data, error, mutate } = useSWR('/api/databases', fetcher, {
        revalidateIfStale: false,
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
