import { useState, useEffect } from 'react'

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

const defaultSettings: MainSettings = {
  idGeneration: {
    combinations: [[3, 3], [3, 4], [3, 5], [4, 3], [4, 4], [5, 3], [5, 4], [4, 5]],
    defaultGenusLength: 3,
    defaultSpeciesLength: 3,
    maxGenusLength: 6,
    maxSpeciesLength: 6,
    startingNumber: 1,
    useCollisionAvoidance: true,
    numberPadding: 0,
  },
  labInfo: {
    name: "",
    location: "",
    latitude: undefined,
    longitude: undefined,
  }
}

export function useMainSettings() {
  const [settings, setSettings] = useState<MainSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/settings')
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            setSettings(result.data)
          } else {
            setSettings(defaultSettings)
          }
        } else {
          setSettings(defaultSettings)
        }
      } catch (err) {
        console.error('Error fetching main settings:', err)
        setError('Failed to load settings')
        setSettings(defaultSettings)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const refetch = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/settings')
      
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setSettings(result.data)
        }
      }
    } catch (err) {
      console.error('Error refetching main settings:', err)
      setError('Failed to reload settings')
    } finally {
      setLoading(false)
    }
  }

  return {
    settings,
    loading,
    error,
    refetch,
    idGeneration: settings.idGeneration,
    labInfo: settings.labInfo,
  }
}
