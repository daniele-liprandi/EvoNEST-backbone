"use client"

import { CardTitle, CardDescription, CardHeader, CardContent, CardFooter, Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useConfigTypes } from "@/hooks/useConfigTypes"

export default function Component() {
  const { sampletypes, loading, error } = useConfigTypes()
  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid gap-6 md:gap-8 px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
          <div className="grid gap-1">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Samples</h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-[600px]">
              All the samples collected in your NEST
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <Link href="/samples/general">
            <Card className="p-6 lg:p-8 rounded-xl shadow-lg dark:shadow-orange-500/50">
              <CardHeader>
                <CardTitle>General</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2 ">
                  <span>
                    Visit the general table containing all the samples in your NEST.
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
          {sampletypes.map((sampletype) => (
          <Link key={sampletype.value} href={`/samples/${sampletype.value}`}>
            <Card className="p-6 lg:p-8 rounded-xl shadow-lg dark:shadow-orange-500/50">
              <CardHeader>
                <CardTitle>{sampletype.label}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2">
                  <span>
                    Visit the {sampletype.label} table and set their status.
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>))}
          <Link href="/samples/maintenance">
            <Card className="p-6 lg:p-8 rounded-xl shadow-lg dark:shadow-orange-500/50">
              <CardHeader>
                <CardTitle>Maintenance</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2">
                  <span>Quickly access filtered tables to help with the collection maintenance</span>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/samples/analysis">
            <Card className="p-6 lg:p-8 rounded-xl shadow-lg dark:shadow-orange-500/50">
              <CardHeader>
                <CardTitle>Analysis</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2">
                  <span>Get help with your analysis thanks to guides and plots</span>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/samples/import">
            <Card className="p-6 lg:p-8 rounded-xl shadow-lg dark:shadow-orange-500/50">
              <CardHeader>
                <CardTitle>Import</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2">
                  <span>Import samples from your csv files to the NEST</span>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/samples/qrlabels">
            <Card className="p-6 lg:p-8 rounded-xl shadow-lg dark:shadow-orange-500/50">
              <CardHeader>
                <CardTitle>QR Labels</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2">
                  <span>Generate QR codes for your new or existing samples</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </section>
  )
}
