/**
 * Utility functions for fetching and working with main settings
 */

interface IdGenerationSettings {
  combinations: [number, number][]
  defaultGenusLength: number
  defaultSpeciesLength: number
  maxGenusLength: number
  maxSpeciesLength: number
  startingNumber: number
  useCollisionAvoidance: boolean
  numberPadding: number
}

interface LabInfo {
  name: string
  location: string
  latitude?: number
  longitude?: number
}

interface MainSettings {
  idGeneration: IdGenerationSettings
  labInfo: LabInfo
}

/**
 * Fetch main settings from the API
 * Returns null if settings cannot be fetched
 */
export async function fetchMainSettings(): Promise<MainSettings | null> {
  try {
    const response = await fetch('/api/settings')
    
    if (response.ok) {
      const result = await response.json()
      if (result.success && result.data) {
        return result.data as MainSettings
      }
    }
    
    return null
  } catch (error) {
    console.error('Error fetching main settings:', error)
    return null
  }
}

/**
 * Get ID generation settings specifically
 * Falls back to defaults if settings cannot be fetched
 */
export async function getIdGenerationSettings(): Promise<IdGenerationSettings> {
  const settings = await fetchMainSettings()
  
  if (settings?.idGeneration) {
    return settings.idGeneration
  }
  
  // Return default settings if none are found
  return {
    combinations: [[3, 3], [3, 4], [3, 5], [4, 3], [4, 4], [5, 3], [5, 4], [4, 5]],
    defaultGenusLength: 3,
    defaultSpeciesLength: 3,
    maxGenusLength: 6,
    maxSpeciesLength: 6,
    startingNumber: 1,
    useCollisionAvoidance: true,
    numberPadding: 0,
  }
}

/**
 * Get lab information settings
 * Falls back to defaults if settings cannot be fetched
 */
export async function getLabInfo(): Promise<LabInfo> {
  const settings = await fetchMainSettings()
  
  if (settings?.labInfo) {
    return settings.labInfo
  }
  
  // Return default settings if none are found
  return {
    name: "",
    location: "",
    latitude: undefined,
    longitude: undefined,
  }
}

/**
 * Check if main settings have been configured
 */
export async function hasMainSettings(): Promise<boolean> {
  const settings = await fetchMainSettings()
  return settings !== null && settings.labInfo.name !== "" && settings.labInfo.location !== ""
}
