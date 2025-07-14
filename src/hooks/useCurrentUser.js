// useCurrentUser.js
import { useSession } from "next-auth/react";
import useSWR from 'swr';

const fetcher = url => fetch(url).then(res => res.json());

export const useCurrentUser = () => {
    const { data: session, status } = useSession();
    
    const { data: userData, error } = useSWR(
        session?.user ? '/api/user' : null,
        fetcher,
        {
            revalidateIfStale: false,
            revalidateOnFocus: false,
            dedupingInterval: 300000, // 5 minutes
        }
    );

    const { data: roleData, error: roleError } = useSWR(
        session?.user ? '/api/user/role' : null,
        fetcher,
        {
            revalidateIfStale: false,
            revalidateOnFocus: false,
            dedupingInterval: 300000, // 5 minutes
        }
    );

    return {
        currentUser: userData,
        userError: error || roleError,
        isUserLoading: (!error && !userData && !!session?.user) || (!roleError && !roleData && !!session?.user),
        isAuthenticated: !!session?.user,
        sessionLoading: status === "loading",
        isAdmin: roleData?.isAdmin || userData?.role === 'admin'
    };
};
