"use client"

import { UploadSimple } from "@phosphor-icons/react"

import { FilesMarquee } from "@/components/ui/custom/file-card"
import { SmartVaul } from "@/components/forms/smart-vaul"
import { NavCard } from "@/components/nest/nav-card"
import { useExperimentsData } from "@/hooks/useExperimentData"
import { useSampleData } from "@/hooks/useSampleData"
import { useUserData } from "@/hooks/useUserData"
import { tableSwrConfig } from "@/hooks/swrConfig"
import { prepend_path } from "@/lib/utils"

export default function ExperimentsLandingPage() {
  const { samplesData, samplesError } = useSampleData(prepend_path, tableSwrConfig)
  const { experimentsData, experimentsError } = useExperimentsData(prepend_path, false, undefined, tableSwrConfig)
  const { usersData, usersError } = useUserData(prepend_path, tableSwrConfig)

  if (samplesError || usersError || experimentsError) {
    return <p className="p-6 text-sm text-destructive">Could not load experiments.</p>
  }

  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid gap-6 px-4 md:gap-8 md:px-6">
        <div className="grid gap-1">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Experiments</h1>
          <p className="max-w-[600px] text-muted-foreground">
            All the experiments in your NEST.
          </p>
        </div>

        <SmartVaul
          formType="experiments"
          users={usersData}
          samples={samplesData}
          experiments={experimentsData}
        >
          <button
            type="button"
            className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
          >
            <UploadSimple className="size-7" />
            <span className="text-sm font-medium">Add an experiment</span>
          </button>
        </SmartVaul>

        <FilesMarquee />

        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          <NavCard
            href="/experiments/general"
            title="General"
            description="Every experiment in the NEST, in one table."
          />
          <NavCard
            href="/experiments/media"
            title="Media"
            description="Images and videos recorded in the NEST."
          />
          <NavCard
            href="/experiments/document"
            title="Documents"
            description="PDFs and docs attached to experiments."
          />
        </div>
      </div>
    </section>
  )
}
