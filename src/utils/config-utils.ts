/**
 * Utility function to check if configuration exists for the current database
 * Returns true if at least one config type exists, false otherwise
 */
export async function checkConfigExists(): Promise<boolean> {
  try {
    // The wizard seeds every config type together, so one non-empty type means
    // setup has run. This is on the critical path of every page load — keep it
    // to a single request.
    const response = await fetch('/api/config/types?type=sampletypes')
    if (!response.ok) return false
    const config = await response.json()
    return Boolean(config && Array.isArray(config.data) && config.data.length > 0)
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
