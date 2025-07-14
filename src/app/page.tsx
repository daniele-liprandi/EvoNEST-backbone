"use client"

import Image from "next/image"
import Link from "next/link"
import { useTheme } from 'next-themes'

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ModeToggle } from '@/components/ui/custom/mode-toggle'
import { EvoNestLogo } from '@/components/ui/custom/evonest-logo'
import herodark from "@/images/hero-dark.png"
import herolight from "@/images/hero-light.png"

export default function Home() {
  const { setTheme } = useTheme()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header with mode toggle */}
        <div className="flex justify-end mb-8">
          <ModeToggle setTheme={setTheme} />
        </div>
        {/* Main content */}
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <EvoNestLogo size="2xl"/>
          </div>
          
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Welcome to EvoNEST
          </h1>
          
          <p className="text-xl text-muted-foreground">
            Your centralized platform for biomechanical data collection and analysis.
          </p>

          <div className="flex justify-center">
            <Button asChild size="lg">
              <Link href="/home">
                Login to your NEST
              </Link>
            </Button>
          </div>

          {/* Hero image card */}
          <Card className="mt-12">
            <CardContent className="p-6">
              <Image
                src={herodark}
                alt="EvoNEST Dashboard Dark"
                className="hidden w-full rounded-lg dark:block"
                priority
              />
              <Image
                src={herolight}
                alt="EvoNEST Dashboard Light"
                className="block w-full rounded-lg dark:hidden"
                priority
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}