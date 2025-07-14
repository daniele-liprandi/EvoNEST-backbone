import { useState, useEffect } from 'react'
import { checkConfigExists } from '@/utils/config-utils'

/**
 * Hook to check if configuration exists
 * Returns { configExists, loading, recheckConfig }
 */
export function useConfigCheck() {
  const [configExists, setConfigExists] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const recheckConfig = async () => {
    setLoading(true)
    try {
      const exists = await checkConfigExists()
      setConfigExists(exists)
    } catch (error) {
      console.error('Error checking config:', error)
      setConfigExists(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    recheckConfig()
  }, [])

  return {
    configExists,
    loading,
    recheckConfig
  }
}
