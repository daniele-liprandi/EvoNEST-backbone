"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import { Check, CaretLeft } from "@phosphor-icons/react"

import { prepend_path } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Preset {
  value: string
  label: string
  description: string
}

interface ConfigSetupProps {
  onComplete: () => void
  showAsDialog?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Wizard({ onComplete }: { onComplete: () => void }) {
  const { data: presets } = useSWR<Preset[]>(`${prepend_path}/api/config/presets`, fetcher)
  const [step, setStep] = useState(0)
  const [labName, setLabName] = useState("")
  const [labDescription, setLabDescription] = useState("")
  const [preset, setPreset] = useState("generic")
  const [submitting, setSubmitting] = useState(false)

  const apply = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`${prepend_path}/api/config/types/seed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset, labName, labDescription }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Setup failed")
      toast.success("Your NEST is set up")
      onComplete()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Setup failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {step === 0 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">About your lab</h2>
            <p className="text-sm text-muted-foreground">
              This names your NEST. The description is optional and helps tailor the setup.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lab-name">Lab name</Label>
            <Input
              id="lab-name"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="e.g. Spider Silk Lab, University of Somewhere"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lab-description">What does your lab study?</Label>
            <Textarea
              id="lab-description"
              value={labDescription}
              onChange={(e) => setLabDescription(e.target.value)}
              placeholder="A sentence or two: the organisms, the measurements, the questions."
              rows={3}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(1)} disabled={!labName.trim()}>
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Choose a starting point</h2>
            <p className="text-sm text-muted-foreground">
              This sets the initial sample and trait types. You can change all of it later under Settings.
            </p>
          </div>
          <div className="grid gap-2">
            {(presets ?? []).map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPreset(p.value)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  preset === p.value
                    ? "border-primary bg-muted/50"
                    : "hover:border-primary/40 hover:bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.label}</span>
                  {preset === p.value && <Check className="size-4 text-primary" />}
                </div>
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              <CaretLeft className="size-4" /> Back
            </Button>
            <Button onClick={apply} disabled={submitting}>
              {submitting ? "Setting up…" : "Set up my NEST"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ConfigSetup({ onComplete, showAsDialog = false, open = true, onOpenChange }: ConfigSetupProps) {
  const body = <Wizard onComplete={onComplete} />

  if (showAsDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Set up your NEST</DialogTitle>
            <DialogDescription>A couple of questions and you are ready to go.</DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>Set up your NEST</CardTitle>
        <CardDescription>A couple of questions and you are ready to go.</CardDescription>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  )
}
