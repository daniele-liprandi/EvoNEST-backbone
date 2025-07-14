// useUserData.js
import useSWR from 'swr';
const fetcher = url => fetch(url).then(res => res.json());

export const useUserData = (prependPath, options, isAuth = false) => {
    const path = isAuth ? `${prependPath}/api/users?auth=true` : `${prependPath}/api/users`;
    const { data, error } = useSWR(path, fetcher, options);
    return {
        usersData: data,
        usersError: error,
        isLoading: !error && !data,
    };  
};
