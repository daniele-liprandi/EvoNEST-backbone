import { NavCard } from "@/components/nest/nav-card";

export default function AnalysisLandingPage() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid gap-6 px-4 md:gap-8 md:px-6">
        <div className="grid gap-1">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Analysis</h1>
          <p className="max-w-[600px] text-muted-foreground">Summaries of the samples and traits in your NEST.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          <NavCard
            href="/analysis/traits"
            title="Trait statistics"
            description="Mean, standard deviation, range and median of one quantity, by group."
          />
          <NavCard
            href="/analysis/tables"
            title="Summary tables"
            description="Count samples, or summarise a quantity, across rows and columns of your choice."
          />
        </div>
      </div>
    </section>
  );
}
