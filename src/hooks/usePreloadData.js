// hooks/usePreloadData.ts
import { useCallback } from 'react';
import { preload } from 'swr';
import { prepend_path } from '@/lib/utils';

// Global fetcher function matching our SWR config
const fetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }
  return res.json();
};

// Preload specific data types
export const usePreloadData = () => {
  const preloadSamples = useCallback(() => {
    preload(`${prepend_path}/api/samples`, fetcher);
  }, []);

  const preloadTraits = useCallback(() => {
    preload(`${prepend_path}/api/traits`, fetcher);
  }, []);

  const preloadExperiments = useCallback(() => {
    preload(`${prepend_path}/api/experiments`, fetcher);
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