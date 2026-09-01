"use client"

import { useConfigCheck } from "@/hooks/useConfigCheck"
import { ConfigSetup } from "@/components/config-setup"

/**
 * Blocks the whole app until the lab has a configuration. A fresh install has
 * no sample/trait types, so nothing downstream would work — the setup wizard
 * is the only thing shown until it is done.
 */
export function FirstRunGate({ children }: { children: React.ReactNode }) {
  const { configExists, loading } = useConfigCheck()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (configExists === false) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <ConfigSetup onComplete={() => window.location.reload()} />
      </div>
    )
  }

  return <>{children}</>
}
