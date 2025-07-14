'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Skeleton } from "@/components/ui/skeleton"

// Dynamically import the TraitsExplorer component with SSR disabled
const TraitsExplorer = dynamic(() => import('@/app/(nest)/traits/traits-explorer'), { 
  ssr: false,
  loading: () => <Skeleton className="h-[500px] w-full" />
})

export default function TraitsWalkerPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Traits graph generator</h1>
      <Suspense fallback={<Skeleton className="h-[500px] w-full" />}>
        <TraitsExplorer />
      </Suspense>
    </div>
  )
}