'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Skeleton } from "@/components/ui/skeleton"

// Dynamically import the SamplesExplorer component with SSR disabled
const SamplesExplorer = dynamic(() => import('@/app/(nest)/samples/samples-explorer'), { 
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-full" />
})

export default function SamplesWalkerPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Samples graph generator</h1>
      <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
        <SamplesExplorer />
      </Suspense>
    </div>
  )
}