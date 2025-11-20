// Simple synchronous getters for config types with fallbacks
// Use these when you need immediate access without React hooks

import { 
  sampletypes as defaultSampleTypes,
  traittypes as defaultTraitTypes,
  equipmenttypes as defaultEquipmentTypes,
  samplesubtypes as defaultSampleSubtypes,
  silkcategories as defaultSilkCategories,
  SIprefixes as defaultSIprefixes,
  baseunits as defaultBaseUnits,
  LabelType
} from '@/utils/types'

// Cache for configuration data
let configCache: Record<string, any> = {}
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get sample types with database fallback
 * For use in non-React contexts or when you need synchronous access
 */
export function getSampleTypesSync(): LabelType[] {
  return configCache.sampletypes || defaultSampleTypes
}

/**
 * Get trait types with database fallback
 */
export function getTraitTypesSync(): LabelType[] {
  return configCache.traittypes || defaultTraitTypes
}

/**
 * Get equipment types with database fallback
 */
export function getEquipmentTypesSync(): LabelType[] {
  return configCache.equipmenttypes || defaultEquipmentTypes
}

/**
 * Get sample subtypes with database fallback
 */
export function getSampleSubtypesSync(): LabelType[] {
  return configCache.samplesubtypes || defaultSampleSubtypes
}

/**
 * Get silk categories with database fallback
 */
export function getSilkCategoriesSync(): LabelType[] {
  return configCache.silkcategories || defaultSilkCategories
}

/**
 * Get base units with database fallback
 */
export function getBaseUnitsSync(): LabelType[] {
  return configCache.baseunits || defaultBaseUnits
}

/**
 * Load configuration from API into cache
 * Call this on app initialization or when you know config might have changed
 */
export async function loadConfigCache(): Promise<void> {
  const now = Date.now()
  
  // Return cached data if still fresh
  if (now - cacheTimestamp < CACHE_DURATION && Object.keys(configCache).length > 0) {
    return
  }

  try {
    const configTypes = ['sampletypes', 'traittypes', 'equipmenttypes', 'samplesubtypes', 'silkcategories', 'siprefixes', 'baseunits']
    const newCache: Record<string, any> = {}

    for (const configType of configTypes) {
      try {
        const response = await fetch(`/api/config/types?type=${configType}`)
        if (response.ok) {
          const config = await response.json()
          if (config && config.data && config.data.length > 0) {
            newCache[configType] = config.data
          } else {
            // Use defaults if no data
            newCache[configType] = getDefaultForType(configType)
          }
        } else {
          newCache[configType] = getDefaultForType(configType)
        }
      } catch (error) {
        console.warn(`Failed to load ${configType}, using defaults:`, error)
        newCache[configType] = getDefaultForType(configType)
      }
    }

    configCache = newCache
    cacheTimestamp = now
  } catch (error) {
    console.error('Failed to load config cache:', error)
    // Set defaults if everything fails
    configCache = {
      sampletypes: defaultSampleTypes,
      traittypes: defaultTraitTypes,
      equipmenttypes: defaultEquipmentTypes,
      samplesubtypes: defaultSampleSubtypes,
      silkcategories: defaultSilkCategories,
      siprefixes: defaultSIprefixes,
      baseunits: defaultBaseUnits
    }
    cacheTimestamp = now
  }
}

function getDefaultForType(type: string) {
  switch (type) {
    case 'sampletypes': return defaultSampleTypes
    case 'traittypes': return defaultTraitTypes
    case 'equipmenttypes': return defaultEquipmentTypes
    case 'samplesubtypes': return defaultSampleSubtypes
    case 'silkcategories': return defaultSilkCategories
    case 'siprefixes': return defaultSIprefixes
    case 'baseunits': return defaultBaseUnits
    default: return []
  }
}

/**
 * Clear the cache - useful after configuration changes
 */
export function clearConfigCache(): void {
  configCache = {}
  cacheTimestamp = 0
}

/**
 * Get specific config type synchronously
 */
export function getConfigTypeSync(type: string): LabelType[] {
  return configCache[type] || getDefaultForType(type)
}
