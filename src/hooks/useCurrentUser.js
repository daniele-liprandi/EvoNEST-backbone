// useCurrentUser.js
// Uses the global SWRConfig fetcher (src/lib/swr-fetcher.ts), which throws on a
// non-OK response. With a local `res.json()` fetcher a 401/403 from /api/user or
// /api/user/role resolved with the error body as data, so a signed-in admin whose
// request failed silently read back as a non-admin (no admin settings).
import { useSession } from "next-auth/react";
import useSWR from 'swr';

export const useCurrentUser = () => {
    const { data: session, status } = useSession();

    const { data: userData, error } = useSWR(
        session?.user ? '/api/user' : null,
        {
            revalidateOnFocus: false,
            dedupingInterval: 300000, // 5 minutes
        }
    );

    const { data: roleData, error: roleError } = useSWR(
        session?.user ? '/api/user/role' : null,
        {
            revalidateOnFocus: false,
            dedupingInterval: 300000, // 5 minutes
        }
    );

    const capabilities = roleData?.capabilities ?? [];
    const isAdmin = roleData?.isAdmin || userData?.role === 'admin';

    return {
        currentUser: userData,
        userError: error || roleError,
        isUserLoading: (!error && !userData && !!session?.user) || (!roleError && !roleData && !!session?.user),
        isAuthenticated: !!session?.user,
        sessionLoading: status === "loading",
        isAdmin,
        role: roleData?.role ?? userData?.role ?? null,
        capabilities,
        // Mirrors the server's userCan: admin holds everything.
        can: (capability) => isAdmin || capabilities.includes(capability),
    };
};
