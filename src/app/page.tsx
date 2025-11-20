"use client";

import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModeToggle } from "@/components/ui/custom/mode-toggle";
import { EvoNestLogo } from "@/components/ui/custom/evonest-logo";
import { FeatureResources } from "@/components/landing/feature-resources";
import herodark from "@/images/hero-dark.png";
import herolight from "@/images/hero-light.png";

export default function Home() {
  const { setTheme } = useTheme();

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
            <EvoNestLogo size="2xl" />
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Welcome to EvoNEST
          </h1>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A modular full-stack platform designed for researchers to collect,
            analyze, and share data across diverse species.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg">
              <Link href="/home">Enter</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="https://daniele-liprandi.github.io/EvoNEST-backbone/">
                Documentation
              </Link>
            </Button>
          </div>

          {/* Hero image card */}
          <Card className="mt-12">
            <CardContent className="p-6">
              <Image
                src={herodark}
                alt="EvoNEST Dashboard - Research data management platform"
                className="hidden w-full rounded-lg dark:block"
                priority
              />
              <Image
                src={herolight}
                alt="EvoNEST Dashboard - Research data management platform"
                className="block w-full rounded-lg dark:hidden"
                priority
              />
            </CardContent>
          </Card>

          {/* Features section */}
          <div className="grid md:grid-cols-3 gap-6 mt-16 text-left">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Data Collection</h3>
                <p className="text-muted-foreground">
                  Efficiently collect and manage your research data with our
                  intuitive interface.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">
                  Sample Management
                </h3>
                <p className="text-muted-foreground">
                  Organize and track biological specimens with comprehensive
                  metadata.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-2">Collaboration</h3>
                <p className="text-muted-foreground">
                  Work with team members and manage permissions for seamless
                  research collaboration.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Resources section */}
          <div className="mt-16">
            <FeatureResources />
          </div>
        </div>
      </div>
    </div>
  );
}
