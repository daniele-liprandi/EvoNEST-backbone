"use client"

import { useCallback, useRef, useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useExperimentsData } from '@/hooks/useExperimentData'
import { useSampleData } from '@/hooks/useSampleData'
import { useTraitData } from '@/hooks/useTraitData'
import { useUserData } from '@/hooks/useUserData'
import { prepend_path } from '@/lib/utils'
import { PiBug, PiGraphBold, PiRulerBold, PiUsersBold } from 'react-icons/pi'
import NumberTicker from '@/components/magicui/number-ticker'
import { useAuth } from '@/hooks/useAuth'
import { useConfigCheck } from '@/hooks/useConfigCheck'
import { ConfigSetup } from '@/components/config-setup'
import { CardSamples } from '@/components/nest/dashboard/card-samples'
import { DemoDescription } from '@/components/nest/dashboard/demo-description'
import { getUserIdByName } from '@/hooks/userHooks'
import { CommandBar } from '@/components/nest/ai/CommandBar'
import { ConversationCanvas, ConversationMessage } from '@/components/nest/ai/ConversationCanvas'
import { toast } from 'sonner'
import { mutate } from 'swr'

function getOrCreateThreadId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID()
  const existing = sessionStorage.getItem('evonest-thread-id')
  if (existing) return existing
  const id = crypto.randomUUID()
  sessionStorage.setItem('evonest-thread-id', id)
  return id
}

export default function Home() {
  const { samplesData } = useSampleData(prepend_path, {
    revalidateIfStale: false,
    revalidateOnFocus: false,
    keepPreviousData: true,
  })
  const { usersData } = useUserData(prepend_path)
  const { traitsData } = useTraitData(prepend_path)
  const { experimentsData } = useExperimentsData(prepend_path)
  const { session, isLoading } = useAuth()
  const { configExists, loading } = useConfigCheck()

  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const threadIdRef = useRef<string | null>(null)

  if (!threadIdRef.current) {
    threadIdRef.current = getOrCreateThreadId()
  }

  const handleSend = useCallback(async (text: string) => {
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setAiLoading(true)
    try {
      const res = await fetch(`${prepend_path}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, threadId: threadIdRef.current }),
      })
      const { blocks } = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', blocks }])
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        blocks: [{ type: 'text', content: 'Something went wrong. Please try again.' }],
      }])
    } finally {
      setAiLoading(false)
    }
  }, [])

  const handleConfirm = useCallback(async (entity: string, records: Record<string, any>[]) => {
    if (!records.length) {
      toast.error('No records to save.')
      return
    }

    try {
      const endpoint = entity === 'traits' ? `${prepend_path}/api/traits` : `${prepend_path}/api/samples`

      const responsible = getUserIdByName(session?.user?.name, usersData ?? [])
      const payloads = records.map((record) => {
        if (entity === 'traits') {
          const sampleId = record.sampleId
            ?? samplesData?.find((s: any) => s.name === record.sampleName)?._id
          return {
            ...record,
            method: 'create',
            sampleId,
            responsible: record.responsible ?? responsible,
          }
        }

        return {
          ...record,
          responsible: record.responsible ?? responsible,
        }
      })

      const results = await Promise.all(payloads.map(async (payload, index) => {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        let body: any = null
        try {
          body = await response.json()
        } catch {
          body = null
        }

        return { index, response, body }
      }))

      const failed = results.filter(({ response }) => !response.ok)
      if (failed.length) {
        const first = failed[0]
        const reason = first.body?.error ?? first.response.statusText
        throw new Error(`${failed.length}/${records.length} records failed to save: ${reason}`)
      }

      await mutate(`${prepend_path}/api/samples`)
      await mutate(`${prepend_path}/api/traits`)
      toast.success(`${records.length} ${entity} saved successfully`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save records. Please try again.'
      toast.error(message)
    }
  }, [samplesData, session?.user?.name, usersData])

  const handleFix = useCallback(() => {
    document.querySelector<HTMLInputElement>('input[placeholder*="Ask anything"]')?.focus()
  }, [])

  if (loading) return <div>Loading…</div>
  if (configExists === false) {
    return (
      <div className="container mx-auto py-8">
        <ConfigSetup onComplete={() => window.location.reload()} />
      </div>
    )
  }
  if (isLoading) return <div>Loading…</div>

  const isDemo = session?.user?.name === 'demo'
  const totalSamples = samplesData?.length ?? 0
  const totalUsers = usersData?.length ?? 0
  const totalTraits = traitsData?.length ?? 0
  const totalExperiments = experimentsData?.length ?? 0
  const uniqueGenus = samplesData ? new Set(samplesData.map((s: any) => s.genus)).size : 0
  const uniqueSpecies = samplesData
    ? new Set(samplesData.map((s: any) => `${s.genus} ${s.species}`)).size
    : 0
  const lastWeek = new Date(); lastWeek.setDate(lastWeek.getDate() - 7)
  const samplesLastWeek = samplesData?.filter((s: any) => new Date(s.date) > lastWeek).length ?? 0

  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        {isDemo && <DemoDescription />}

        <div className="flex gap-4 min-h-[400px]">
          <div className="flex flex-col flex-1 gap-2">
            <CommandBar onSend={handleSend} loading={aiLoading} />
            <ConversationCanvas
              messages={messages}
              samplesData={samplesData ?? []}
              onConfirm={handleConfirm}
              onFix={handleFix}
            />
          </div>
          <div className="hidden lg:block w-72 shrink-0">
            {samplesData ? (
              <CardSamples data={samplesData} />
            ) : (
              <Skeleton className="h-full w-full rounded-xl" />
            )}
          </div>
        </div>

        <Accordion type="multiple">
          <AccordionItem value="stats">
            <AccordionTrigger>Dashboard - stats and recent samples</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Users</CardTitle>
                    <PiUsersBold className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <NumberTicker className="text-2xl font-bold" value={totalUsers} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Samples</CardTitle>
                    <PiBug className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <NumberTicker className="text-2xl font-bold" value={totalSamples} />
                    <p className="text-xs text-muted-foreground">
                      {uniqueGenus} genera · {uniqueSpecies} species
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Experiments</CardTitle>
                    <PiGraphBold className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <NumberTicker className="text-2xl font-bold" value={totalExperiments} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Traits</CardTitle>
                    <PiRulerBold className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <NumberTicker className="text-2xl font-bold" value={totalTraits} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Samples last week</CardTitle>
                    <PiBug className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <NumberTicker className="text-2xl font-bold" value={samplesLastWeek} />
                  </CardContent>
                </Card>
              </div>
              <div className="lg:hidden">
                {samplesData ? <CardSamples data={samplesData} /> : <Skeleton className="h-64 w-full" />}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>
    </div>
  )
}
