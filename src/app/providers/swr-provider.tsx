// app/providers/swr-provider.tsx
'use client';

import { SWRConfig } from 'swr';
import { swrFetcher } from '@/lib/swr-fetcher';

const SWRProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SWRConfig
      value={{
        // Revalidate every 5 minutes
        dedupingInterval: 300000,
      
        // Revalidate on focus after 10 seconds since last fetch
        focusThrottleInterval: 10000,  
        // Don't revalidate while window is hidden
        revalidateOnFocus: false,
        // Don't revalidate on network reconnection
        revalidateOnReconnect: false,
        // Keep previous data while revalidating
        keepPreviousData: true,
        // Retry failed requests 3 times
        errorRetryCount: 3,

        // Handle errors globally
        onError: (error, key) => {
          if (error.status !== 403 && error.status !== 404) {
            console.error(`SWR Error for ${key}:`, error);
          }
        },

        // Configure fetcher globally
        fetcher: swrFetcher,
      }}
    >
      {children}
    </SWRConfig>
  );
};

export default SWRProvider;