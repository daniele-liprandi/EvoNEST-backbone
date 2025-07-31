"use client"

import * as React from 'react'
import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  sampletypes, 
  traittypes, 
  equipmenttypes, 
  samplesubtypes,
} from "@/utils/types"
import { ConfigSetup } from "@/components/config-setup"
import { checkConfigExists } from "@/utils/config-utils"

interface LabelType {
  value: string
  label: string
  description?: string
  unit?: string
  shortened?: string
  [key: string]: string | number | undefined
}

interface TypeTableProps {
  title: string
  description?: string
  data: LabelType[]
  showColumns: string[]
  configType: string
  onRefresh: () => void
}

const AddItemForm = ({ configType, onSuccess }: { configType: string, onSuccess: () => void }) => {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    value: '',
    label: '',
    description: '',
    unit: '',
    shortened: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/config/types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'additem',
          type: configType,
          item: {
            value: formData.value,
            label: formData.label,
            description: formData.description || undefined,
            unit: formData.unit || undefined,
            shortened: formData.shortened || undefined
          }
        })
      })

      if (response.ok) {
        setFormData({ value: '', label: '', description: '', unit: '', shortened: '' })
        setOpen(false)
        onSuccess()
      } else {
        console.error('Failed to add item')
      }
    } catch (error) {
      console.error('Error adding item:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Add Item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Add a new item to {configType}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">Value*</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="label" className="text-right">Label*</Label>
              <Input
                id="label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            {(configType === 'traittypes') && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unit" className="text-right">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="col-span-3"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="shortened" className="text-right">Shortened</Label>
              <Input
                id="shortened"
                value={formData.shortened}
                onChange={(e) => setFormData({ ...formData, shortened: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const TypeTable = ({ title, description, data, showColumns, configType, onRefresh }: TypeTableProps) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex justify-between items-center">
        {title}
        <AddItemForm configType={configType} onSuccess={onRefresh} />
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            {showColumns.map((column) => (
              <TableHead key={column} className="capitalize">
                {column.replace(/([A-Z])/g, ' $1').trim()}
                {column === 'unit' && ' (default)'}
              </TableHead>
            ))}
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index) => (
            <TableRow key={index}>
              {showColumns.map((column) => (
                <TableCell key={column}>
                  {item[column] || '-'}
                </TableCell>
              ))}
              <TableCell>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDeleteItem(configType, item.value, onRefresh)}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)

const handleDeleteItem = async (configType: string, value: string, onRefresh: () => void) => {
  if (!confirm('Are you sure you want to delete this item?')) return

  try {
    const response = await fetch('/api/config/types', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: configType,
        value: value
      })
    })

    if (response.ok) {
      onRefresh()
    } else {
      console.error('Failed to delete item')
    }
  } catch (error) {
    console.error('Error deleting item:', error)
  }
}

export default function TypesPage() {
  const [configs, setConfigs] = useState<Record<string, LabelType[]>>({
    sampletypes: sampletypes,
    traittypes: traittypes,
    samplesubtypes: samplesubtypes,
    equipmenttypes: equipmenttypes
  })
  const [loading, setLoading] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [configExists, setConfigExists] = useState<boolean | null>(null)

  const checkConfiguration = async () => {
    const exists = await checkConfigExists()
    setConfigExists(exists)
    if (!exists) {
      setShowSetup(true)
    }
    return exists
  }

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const configTypes = ['sampletypes', 'traittypes', 'samplesubtypes', 'equipmenttypes']
      
      for (const configType of configTypes) {
        try {          const response = await fetch(`/api/config/types?type=${configType}`)
          if (response.ok) {
            const config = await response.json()
            if (config && config.data) {
              setConfigs((prev: Record<string, LabelType[]>) => ({ ...prev, [configType]: config.data || [] }))
            }
          }
        } catch (error) {
          console.warn(`Using default ${configType}:`, error)
          // Keep default values if API fails
        }
      }
    } catch (error) {
      console.error('Error fetching configs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialize = async () => {
      const exists = await checkConfiguration()
      if (exists) {
        await fetchConfigs()
      }
    }
    initialize()
  }, [])

  const refreshConfig = () => {
    fetchConfigs()
  }

  const handleSetupComplete = async () => {
    setShowSetup(false)
    setConfigExists(true)
    await fetchConfigs()
  }

  const setToDefaults = async () => {
    if (!confirm('Are you sure you want to set all configurations to defaults? This will overwrite any custom changes.')) {
      return;
    }

    setLoading(true)
    try {
      const response = await fetch('/api/config/types/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Reset result:', result)
        await fetchConfigs() // Refresh after resetting
      } else {
        console.error('Failed to set to defaults')
      }
    } catch (error) {
      console.error('Error resetting to defaults:', error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="container mx-auto py-8">
      {showSetup ? (
        <ConfigSetup onComplete={handleSetupComplete} />
      ) : (
        <>
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Types Configuration</h1>
            <div className="space-x-2">
              <Button onClick={setToDefaults} disabled={loading} variant="outline">
                {loading ? 'Resetting...' : 'Set to Defaults'}
              </Button>
              <Button onClick={refreshConfig} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>
          
          <TypeTable
            title="Sample Types"
            description="Different types of samples that can be recorded in the system"
            data={configs.sampletypes}
            showColumns={['label', 'value', 'description', 'shortened']}
            configType="sampletypes"
            onRefresh={refreshConfig}
          />

          <TypeTable
            title="Trait Types"
            description="Different types of measurements and traits that can be recorded"
            data={configs.traittypes}
            showColumns={['label', 'value', 'unit', 'description']}
            configType="traittypes"
            onRefresh={refreshConfig}
          />

          <TypeTable
            title="Sample Subtypes"
            description="Specific categories of samples"
            data={configs.samplesubtypes}
            showColumns={['label', 'value', 'description', 'shortened']}
            configType="samplesubtypes"
            onRefresh={refreshConfig}
          />

          <TypeTable
            title="Equipment Types"
            description="Different types of equipment used for measurements"
            data={configs.equipmenttypes}
            showColumns={['label', 'value', 'description', 'shortened']}
            configType="equipmenttypes"
            onRefresh={refreshConfig}
          />
        </>
      )}
    </div>
  )
}