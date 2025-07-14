"use client"

import { CardTitle, CardDescription, CardHeader, CardContent, CardFooter, Card } from "@/components/ui/card"
import Link from "next/link"

export default function Component() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32">
      <div className="container grid gap-6 md:gap-8 px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
          <div className="grid gap-1">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Settings</h1>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <Link href="/settings/main">
            <Card className="p-6 lg:p-8 rounded-xl shadow-lg dark:shadow-orange-500/50">
              <CardHeader>
                <CardTitle>Main settings</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2 ">
                  <span>
                    Edit your NEST settings including sample ID generation
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/settings/types">
            <Card className="p-6 lg:p-8 rounded-xl shadow-lg dark:shadow-orange-500/50">
              <CardHeader>
                <CardTitle>Types and categories</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center gap-2">
                  <span>Decide which sample, trait, equipment types appear in the NEST</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </section>
  )
}
