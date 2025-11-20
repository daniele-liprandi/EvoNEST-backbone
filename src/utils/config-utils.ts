/**
 * Utility function to check if configuration exists for the current database
 * Returns true if at least one config type exists, false otherwise
 */
export async function checkConfigExists(): Promise<boolean> {
  try {
    const configTypes = ['sampletypes', 'traittypes', 'samplesubtypes', 'equipmenttypes', 'silktypes', 'siprefixes', 'baseunits']
    
    for (const configType of configTypes) {
      const response = await fetch(`/api/config/types?type=${configType}`)
      if (response.ok) {
        const config = await response.json()
        if (config && config.data && config.data.length > 0) {
          return true // Found at least one non-empty config
        }
      }
    }
    
    return false // No configs found or all are empty
  } catch (error) {
    console.error('Error checking config existence:', error)
    return false // Assume no config on error
  }
}

/**
 * Check if any configuration exists at all
 */
export async function hasAnyConfig(): Promise<boolean> {
  try {
    const response = await fetch('/api/config/types')
    if (response.ok) {
      const configs = await response.json()
      return Array.isArray(configs) && configs.length > 0
    }
    return false
  } catch (error) {
    console.error('Error checking for any config:', error)
    return false
  }
}
