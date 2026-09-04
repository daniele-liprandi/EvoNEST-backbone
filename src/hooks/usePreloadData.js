// hooks/usePreloadData.ts
import { useCallback } from 'react';
import { preload } from 'swr';
import { prepend_path } from '@/lib/utils';
import { swrFetcher } from '@/lib/swr-fetcher';

// Preload specific data types
export const usePreloadData = () => {
  const preloadSamples = useCallback(() => {
    preload(`${prepend_path}/api/samples`, swrFetcher);
  }, []);

  const preloadTraits = useCallback(() => {
    preload(`${prepend_path}/api/traits`, swrFetcher);
  }, []);

  const preloadExperiments = useCallback(() => {
    preload(`${prepend_path}/api/experiments`, swrFetcher);
  }, []);

  // Preload all data types
  const preloadAll = useCallback(() => {
    preloadSamples();
    preloadTraits();
    preloadExperiments();
  }, [preloadSamples, preloadTraits, preloadExperiments]);

  return {
    preloadSamples,
    preloadTraits,
    preloadExperiments,
    preloadAll,
  };
};

// Navigation link component with preloading
export const usePreloadOnHover = () => {
  const { preloadAll } = usePreloadData();
  
  const handleMouseEnter = useCallback(() => {
    // Start preloading when user hovers
    preloadAll();
  }, [preloadAll]);

  return { handleMouseEnter };
};