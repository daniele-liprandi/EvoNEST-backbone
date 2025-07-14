import { useState, useEffect } from 'react'
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

/**
 * Hook to get configuration types from database with fallback to defaults
 * Can be used as a drop-in replacement for direct imports from @/utils/types
 */
export function useConfigTypes(): UseConfigTypesResult {
  const [configs, setConfigs] = useState({
    sampletypes: defaultSampleTypes,
    traittypes: defaultTraitTypes,
    equipmenttypes: defaultEquipmentTypes,
    samplesubtypes: defaultSampleSubtypes,
    silkcategories: defaultSilkCategories,
    siprefixes: defaultSIprefixes
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConfigs = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const configTypes = ['sampletypes', 'traittypes', 'equipmenttypes', 'samplesubtypes', 'silkcategories', 'siprefixes']
      const newConfigs = { ...configs }

      for (const configType of configTypes) {
        try {
          const response = await fetch(`/api/config/types?type=${configType}`)
          if (response.ok) {
            const config = await response.json()
            if (config && config.data && config.data.length > 0) {
              newConfigs[configType as keyof typeof newConfigs] = config.data
            }
            // If no data or API fails, keep the default values
          }
        } catch (configError) {
          console.warn(`Using default ${configType}:`, configError)
          // Keep default values on error
        }
      }

      setConfigs(newConfigs)
    } catch (err) {
      console.error('Error fetching configs:', err)
      setError('Failed to fetch configuration')
      // Keep default values on error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConfigs()
  }, [])

  return {
    ...configs,
    loading,
    error,
    refresh: fetchConfigs
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
