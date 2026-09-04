import useSWR from 'swr'
import {
  sampletypes as defaultSampleTypes,
  traittypes as defaultTraitTypes,
  equipmenttypes as defaultEquipmentTypes,
  samplesubtypes as defaultSampleSubtypes,
  silkcategories as defaultSilkCategories,
  SIprefixes as defaultSIprefixes,
  LabelType
} from '@/utils/types'

interface UseConfigTypesResult {
  sampletypes: LabelType[]
  traittypes: LabelType[]
  equipmenttypes: LabelType[]
  samplesubtypes: LabelType[]
  silkcategories: LabelType[]
  siprefixes: any[] // SIprefixes have a different structure
  loading: boolean
  error: string | null
  refresh: () => void
}

// Every consumer (navbar, sample pages, both forms, sample cards...) asks for
// the same six config-type lists. useSWR dedupes by key, so as long as every
// caller uses this hook they share one in-flight request and one cache entry
// per type instead of each mount firing its own fetch.
async function fetchConfigType(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }
  const config = await response.json()
  return config?.data
}

const swrOptions = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
  dedupingInterval: 3_600_000,
} as const

function withFallback<T>(data: T[] | undefined, fallback: T[]): T[] {
  return data && data.length > 0 ? data : fallback
}

/**
 * Hook to get configuration types from database with fallback to defaults
 * Can be used as a drop-in replacement for direct imports from @/utils/types
 */
export function useConfigTypes(): UseConfigTypesResult {
  const sampletypes = useSWR('/api/config/types?type=sampletypes', fetchConfigType, swrOptions)
  const traittypes = useSWR('/api/config/types?type=traittypes', fetchConfigType, swrOptions)
  const equipmenttypes = useSWR('/api/config/types?type=equipmenttypes', fetchConfigType, swrOptions)
  const samplesubtypes = useSWR('/api/config/types?type=samplesubtypes', fetchConfigType, swrOptions)
  const silkcategories = useSWR('/api/config/types?type=silkcategories', fetchConfigType, swrOptions)
  const siprefixes = useSWR('/api/config/types?type=siprefixes', fetchConfigType, swrOptions)

  const all = [sampletypes, traittypes, equipmenttypes, samplesubtypes, silkcategories, siprefixes]
  const loading = all.some((r) => r.data === undefined && !r.error)
  const error = all.some((r) => r.error) ? 'Failed to fetch configuration' : null
  const refresh = () => {
    all.forEach((r) => r.mutate())
  }

  return {
    sampletypes: withFallback(sampletypes.data, defaultSampleTypes),
    traittypes: withFallback(traittypes.data, defaultTraitTypes),
    equipmenttypes: withFallback(equipmenttypes.data, defaultEquipmentTypes),
    samplesubtypes: withFallback(samplesubtypes.data, defaultSampleSubtypes),
    silkcategories: withFallback(silkcategories.data, defaultSilkCategories),
    siprefixes: withFallback(siprefixes.data, defaultSIprefixes),
    loading,
    error,
    refresh,
  }
}

/**
 * Simple function to get sample types synchronously with defaults
 * For use in components that need immediate access without hooks
 */
export async function getSampleTypes(): Promise<LabelType[]> {
  try {
    const response = await fetch('/api/config/types?type=sampletypes')
    if (response.ok) {
      const config = await response.json()
      if (config && config.data && config.data.length > 0) {
        return config.data
      }
    }
  } catch (error) {
    console.warn('Using default sampletypes:', error)
  }
  return defaultSampleTypes
}

/**
 * Simple function to get trait types synchronously with defaults
 */
export async function getTraitTypes(): Promise<LabelType[]> {
  try {
    const response = await fetch('/api/config/types?type=traittypes')
    if (response.ok) {
      const config = await response.json()
      if (config && config.data && config.data.length > 0) {
        return config.data
      }
    }
  } catch (error) {
    console.warn('Using default traittypes:', error)
  }
  return defaultTraitTypes
}

/**
 * Helper to get specific config type
 */
export async function getConfigType(type: string): Promise<LabelType[]> {
  try {
    const response = await fetch(`/api/config/types?type=${type}`)
    if (response.ok) {
      const config = await response.json()
      if (config && config.data && config.data.length > 0) {
        return config.data
      }
    }
  } catch (error) {
    console.warn(`Using default ${type}:`, error)
  }
  
  // Return appropriate default based on type
  switch (type) {
    case 'sampletypes': return defaultSampleTypes
    case 'traittypes': return defaultTraitTypes
    case 'equipmenttypes': return defaultEquipmentTypes
    case 'samplesubtypes': return defaultSampleSubtypes
    case 'silkcategories': return defaultSilkCategories
    case 'siprefixes': return defaultSIprefixes
    default: return []
  }
}
