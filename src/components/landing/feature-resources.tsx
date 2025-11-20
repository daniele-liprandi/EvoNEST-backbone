"use client";

import Link from "next/link";
import { BookOpenIcon, Github, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const resources = [
  {
    title: "Documentation",
    description:
      "Guides for users and developers. Learn how to use EvoNEST and contribute to the platform.",
    icon: BookOpenIcon,
    href: "https://daniele-liprandi.github.io/EvoNEST-backbone/",
    buttonText: "Read the Docs",
    variant: "default" as const,
  },
  {
    title: "GitHub Repository",
    description:
      "Explore the source code, report issues, contribute features, and stay updated with the latest development.",
    icon: Github,
    href: "https://github.com/daniele-liprandi/EvoNEST-backbone",
    buttonText: "View on GitHub",
    variant: "outline" as const,
  },
  {
    title: "Research Paper",
    description:
      "Read the peer-reviewed publication describing EvoNEST's architecture, features, and use cases.",
    icon: FileTextIcon,
    href: "https://doi.org/10.7717/peerj-cs.3186",
    buttonText: "Read the Paper",
    variant: "secondary" as const,
  },
];

export function FeatureResources() {
  return (
    <section id="feature-resources">
      <div className="py-14">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <h4 className="text-xl font-bold tracking-tight text-black dark:text-white">
              Resources
            </h4>
            <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white sm:text-6xl">
              Learn, Contribute, and Cite
            </h2>
            <p className="mt-6 text-xl leading-8 text-black/80 dark:text-white">
              Access documentation, contribute to the open-source project, or cite our research.
            </p>
          </div>
          <div className="container mx-auto my-12 max-w-5xl">
            <div className="grid gap-6 md:grid-cols-3">
              {resources.map((resource, idx) => (
                <Card key={idx} className="flex flex-col transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="mb-4 flex items-center justify-center">
                      <div className="rounded-full bg-primary/10 p-3">
                        <resource.icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <CardTitle className="text-center">{resource.title}</CardTitle>
                    <CardDescription className="text-center">
                      {resource.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow flex items-end justify-center">
                    <Link href={resource.href} target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button variant={resource.variant} className="w-full">
                        {resource.buttonText}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
