// useUserData.js
// Uses the global SWRConfig fetcher (src/app/providers/swr-provider.tsx), which
// throws on a non-OK response so `usersError` actually reflects a failed
// request instead of resolving with the error body as if it were data.
import useSWR from 'swr';

export const useUserData = (prependPath, options, isAuth = false) => {
    const path = isAuth ? `${prependPath}/api/users?auth=true` : `${prependPath}/api/users`;
    const { data, error } = useSWR(path, options);
    return {
        usersData: data,
        usersError: error,
        isLoading: !error && !data,
    };  
};
