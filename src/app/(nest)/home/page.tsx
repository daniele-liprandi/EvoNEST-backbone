"use client"

import { useCallback, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useExperimentsData } from '@/hooks/useExperimentData'
import { useSampleData } from '@/hooks/useSampleData'
import { useTraitData } from '@/hooks/useTraitData'
import { useUserData } from '@/hooks/useUserData'
import { prepend_path } from '@/lib/utils'
import { PiBug, PiFlask, PiRuler, PiUsers, PiSparkle, PiArrowRight } from 'react-icons/pi'
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
import Link from 'next/link'
import { cn } from '@/lib/utils'

function getOrCreateThreadId(): string {
  if (typeof window === 'undefined') return crypto.randomUUID()
  const existing = sessionStorage.getItem('evonest-thread-id')
  if (existing) return existing
  const id = crypto.randomUUID()
  sessionStorage.setItem('evonest-thread-id', id)
  return id
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

const SUGGESTIONS = [
  { label: 'Summarise my collection', q: 'Summarise my collection' },
  { label: 'Show recent samples', q: 'Show samples added this week' },
  { label: 'List trait measurements', q: 'List the latest trait measurements' },
]

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
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set())
  const threadIdRef = useRef<string | null>(null)

  if (!threadIdRef.current) {
    threadIdRef.current = getOrCreateThreadId()
  }

  const handleSend = useCallback(async (text: string) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }])
    setAiLoading(true)
    try {
      const res = await fetch(`${prepend_path}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, threadId: threadIdRef.current }),
      })
      const payload = await res.json().catch(() => null)
      const blocks = Array.isArray(payload?.blocks) && payload.blocks.length
        ? payload.blocks
        : [{
            type: 'text',
            content: res.ok
              ? 'No answer came back. Please try again.'
              : 'The assistant is unavailable right now. Please try again.',
          }]
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', blocks }])
    } catch {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        blocks: [{ type: 'text', content: 'Something went wrong. Please try again.' }],
      }])
    } finally {
      setAiLoading(false)
    }
  }, [])

  const handleConfirm = useCallback(async (blockKey: string, entity: string, records: Record<string, any>[]) => {
    if (!records.length) { toast.error('No records to save.'); return }
    if (savingKey || savedKeys.has(blockKey)) return
    setSavingKey(blockKey)
    try {
      const endpoint = entity === 'traits' ? `${prepend_path}/api/traits` : `${prepend_path}/api/samples`
      const responsible = getUserIdByName(session?.user?.name, usersData ?? [])
      const payloads = records.map((record) => {
        if (entity === 'traits') {
          const sampleId = record.sampleId ?? samplesData?.find((s: any) => s.name === record.sampleName)?._id
          return { ...record, method: 'create', sampleId, responsible: record.responsible ?? responsible }
        }
        return { ...record, responsible: record.responsible ?? responsible }
      })
      const results = await Promise.all(payloads.map(async (payload) => {
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        let body: any = null
        try { body = await response.json() } catch { body = null }
        return { response, body }
      }))
      const failed = results.filter(({ response }) => !response.ok)
      if (failed.length) {
        const first = failed[0]
        throw new Error(`${failed.length}/${records.length} records failed: ${first.body?.error ?? first.response.statusText}`)
      }
      await mutate(`${prepend_path}/api/samples`)
      await mutate(`${prepend_path}/api/traits`)
      setSavedKeys((prev) => new Set(prev).add(blockKey))
      toast.success(`${records.length} ${entity} saved successfully`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save records.')
    } finally {
      setSavingKey(null)
    }
  }, [savingKey, savedKeys, samplesData, session?.user?.name, usersData])

  const handleFix = useCallback((_blockKey: string) => {
    document.querySelector<HTMLInputElement>('input[placeholder*="Ask anything"]')?.focus()
  }, [])

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (configExists === false) {
    return (
      <div className="container mx-auto py-8">
        <ConfigSetup onComplete={() => window.location.reload()} />
      </div>
    )
  }
  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>

  const isDemo = session?.user?.name === 'demo'
  const firstName = session?.user?.name?.split(' ')[0] ?? 'there'
  const totalSamples = samplesData?.length ?? 0
  const totalUsers = usersData?.length ?? 0
  const totalTraits = traitsData?.length ?? 0
  const totalExperiments = experimentsData?.length ?? 0
  const uniqueGenus = samplesData ? new Set(samplesData.map((s: any) => s.genus)).size : 0
  const uniqueSpecies = samplesData ? new Set(samplesData.map((s: any) => `${s.genus} ${s.species}`)).size : 0
  const lastWeek = new Date(); lastWeek.setDate(lastWeek.getDate() - 7)
  const samplesLastWeek = samplesData?.filter((s: any) => new Date(s.date) > lastWeek).length ?? 0

  const hasConversation = messages.length > 0

  return (
    <div className="flex flex-col">
      {isDemo && <DemoDescription />}

      {/* ── Hero: airy assistant band ──────────────────────────────── */}
      <section
        className={cn(
          'px-6 transition-all duration-300',
          hasConversation
            ? 'py-5'
            : 'py-14 bg-[radial-gradient(120%_90%_at_50%_0%,hsl(34_100%_42%_/_0.055)_0%,transparent_58%)] rounded-xl'
        )}
      >
        {hasConversation ? (
          <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
            <CommandBar onSend={handleSend} loading={aiLoading} />
            <ConversationCanvas
              messages={messages}
              samplesData={samplesData ?? []}
              onConfirm={handleConfirm}
              onFix={handleFix}
              savingKey={savingKey}
              savedKeys={savedKeys}
            />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[660px] flex flex-col items-center text-center gap-4">
            <p className="font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">
              {greeting()}, {firstName}
            </p>
            <h1 className="font-[var(--font-fira_sans,sans-serif)] text-3xl md:text-4xl font-bold tracking-tight leading-tight text-balance m-0">
              What do you want to explore in the NEST?
            </h1>
            <div className="w-full">
              <CommandBar onSend={handleSend} loading={aiLoading} />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((sg) => (
                <button
                  key={sg.label}
                  onClick={() => handleSend(sg.q)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-[13px] font-medium shadow-sm transition-colors hover:border-primary hover:text-primary cursor-pointer"
                >
                  <PiSparkle className="h-3.5 w-3.5 text-primary" />
                  {sg.label}
                </button>
              ))}
            </div>
            {samplesLastWeek > 0 && (
              <p className="flex items-start gap-2 text-[13px] text-muted-foreground max-w-[520px] text-pretty">
                <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-primary" />
                <span>
                  Since last week: <b className="text-foreground font-semibold">{samplesLastWeek} new {samplesLastWeek === 1 ? 'sample' : 'samples'}</b> added to your collection.
                </span>
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Dashboard: Today in your NEST ──────────────────────────── */}
      <section className="flex flex-col gap-5 mt-3 px-6 pb-16">
        {/* divider */}
        <div className="flex items-center gap-3.5">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[11px] uppercase tracking-[.08em] text-muted-foreground">Today in your NEST</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        {/* two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">

          {/* left column: recent samples */}
          <div className="min-w-0">
            {samplesData ? (
              <CardSamples data={samplesData} />
            ) : (
              <Skeleton className="h-64 w-full rounded-xl" />
            )}
          </div>

          {/* right rail: overview */}
          <aside className="lg:sticky lg:top-[calc(3.5rem+16px)]">
            <Card>
              <CardHeader className="pb-1.5">
                <CardTitle className="font-mono text-[11px] font-medium uppercase tracking-[.08em] text-muted-foreground">
                  Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-border/55">
                  {[
                    { label: 'Samples', value: totalSamples, icon: PiBug, href: '/samples', sub: uniqueSpecies > 0 ? `${uniqueGenus} genera · ${uniqueSpecies} spp.` : undefined },
                    { label: 'Experiments', value: totalExperiments, icon: PiFlask, href: '/experiments' },
                    { label: 'Traits', value: totalTraits, icon: PiRuler, href: '/traits' },
                    { label: 'Users', value: totalUsers, icon: PiUsers, href: '/users' },
                  ].map(({ label, value, icon: Icon, href, sub }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="group flex items-center justify-between py-2.5 px-1 rounded transition-colors hover:bg-muted/50"
                      >
                        <span className="inline-flex items-center gap-2.5 text-[13px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                          <Icon className="h-[15px] w-[15px]" />
                          {label}
                          {sub && <span className="hidden xl:inline text-[11px] font-normal text-muted-foreground/70">{sub}</span>}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <b className="text-[14px] font-semibold tabular-nums text-foreground">{value.toLocaleString()}</b>
                          <PiArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                        </span>
                      </Link>
                    </li>
                  ))}
                  {samplesLastWeek > 0 && (
                    <li>
                      <Link
                        href="/samples"
                        className="group flex items-center justify-between py-2.5 px-1 rounded transition-colors hover:bg-muted/50"
                      >
                        <span className="text-[13px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">This week</span>
                        <span className="inline-flex items-center gap-1">
                          <b className="text-[14px] font-semibold tabular-nums text-green">+{samplesLastWeek}</b>
                          <PiArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                        </span>
                      </Link>
                    </li>
                  )}
                </ul>
                {(uniqueGenus > 0 || uniqueSpecies > 0) && (
                  <p className="mt-3 text-[11.5px] text-muted-foreground">{uniqueGenus} genera · {uniqueSpecies} species</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>
    </div>
  )
}
