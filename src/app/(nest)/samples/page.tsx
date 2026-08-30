"use client"

import { NavCard } from "@/components/nest/nav-card"
import { useConfigTypes } from "@/hooks/useConfigTypes"

export default function SamplesLandingPage() {
  const { sampletypes } = useConfigTypes()

  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid gap-6 px-4 md:gap-8 md:px-6">
        <div className="grid gap-1">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Samples</h1>
          <p className="max-w-[600px] text-muted-foreground">
            All the samples collected in your NEST.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 lg:gap-8">
          <NavCard
            href="/samples/general"
            title="General"
            description="Every sample in your NEST, in one table."
          />
          {sampletypes.map((sampletype) => (
            <NavCard
              key={sampletype.value}
              href={`/samples/${sampletype.value}`}
              title={sampletype.label}
              description={`Browse ${sampletype.label.toLowerCase()} samples and set their status.`}
            />
          ))}
          <NavCard
            href="/samples/maintenance"
            title="Maintenance"
            description="Filtered tables that help with collection upkeep."
          />
          <NavCard
            href="/samples/analysis"
            title="Analysis"
            description="Guides and plots to help you analyse your data."
          />
          <NavCard
            href="/samples/import"
            title="Import"
            description="Bring samples in from your CSV files."
          />
          <NavCard
            href="/samples/qrlabels"
            title="QR labels"
            description="Generate QR codes for new or existing samples."
          />
        </div>
      </div>
    </section>
  )
}
