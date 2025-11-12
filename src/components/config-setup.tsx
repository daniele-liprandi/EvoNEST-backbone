"use client"

import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, Settings, Database } from "lucide-react"

interface ConfigSetupProps {
  onComplete: () => void
  showAsDialog?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ConfigSetup({ onComplete, showAsDialog = false, open = true, onOpenChange }: ConfigSetupProps) {
  const [loading, setLoading] = useState(false)
  const [seeded, setSeeded] = useState(false)

  const handleSeedDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/config/types/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Seed result:', result)
        setSeeded(true)
        // Wait a moment for the user to see the success state
        setTimeout(() => {
          onComplete()
        }, 1500)
      } else {
        console.error('Failed to seed database')
        alert('Failed to initialize configuration. Please try again.')
      }
    } catch (error) {
      console.error('Error seeding database:', error)
      alert('Error initializing configuration. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const SetupContent = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Database className="h-12 w-12 mx-auto text-blue-500" />
        <h2 className="text-2xl font-bold">Welcome to your NEST!</h2>
        <p className="text-muted-foreground">
          It looks like this is your first time using the system. Let&apos;s set up your configuration.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-muted/50 p-4 rounded-lg">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4" />
            What we&apos;ll set up:
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>• Sample types (Animal, Blood, DNA extract, etc.)</li>
            <li>• Trait types (Mass, Length, DNA concentration, etc.)</li>
            <li>• Equipment types (Microscopes, PCR machines, etc.)</li>
            <li>• Sample subtypes (Whole blood, Serum, Muscle, etc.)</li>
            <li>• SI unit prefixes</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900">Note:</h4>
          <p className="text-sm text-blue-800 mt-1">
            These are default configurations that you can customise later. Each database has its own configuration, 
            so different research projects can have their own sample types and measurements.
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        {seeded ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Configuration initialised successfully!</span>
          </div>
        ) : (
          <Button 
            onClick={handleSeedDatabase} 
            disabled={loading}
            size="lg"
            className="w-full sm:w-auto"
          >
            {loading ? 'Initialising...' : 'Initialise configuration'}
          </Button>
        )}
      </div>
    </div>
  )

  if (showAsDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>First time setup</DialogTitle>
            <DialogDescription>
              Initialize your NEST to get started.
            </DialogDescription>
          </DialogHeader>
          <SetupContent />
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>First time setup</CardTitle>
        <CardDescription>
              Initialize your NEST to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SetupContent />
      </CardContent>
    </Card>
  )
}
