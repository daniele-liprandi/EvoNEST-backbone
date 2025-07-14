"use client";

import WordFadeIn from "../magicui/word-fade-in";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import gofairlogo from "@/images/GOFAIR_logo_transparent.png";


export function FeatureTransparency() {
  return (
    <section id="feature-transparency">
      <div className="py-14">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="text-left">
                <WordFadeIn
                  className="text-4xl font-bold tracking-tight text-black dark:text-white sm:text-6xl mb-6"
                  words="Transparency and FAIRness"
                />
                <div className="space-y-6">
                  <p className="text-base font-semibold tracking-tight text-foreground/60">
                    All your data is stored in open formats, based on MongoDB BSON.
                    This means that you can access your data at any time, even if you decide to stop using EvoNEST.
                    This is a key feature of EvoNEST, as it ensures that you are always in control of your data.
                    Transparency is also achieved through the use of unique identifiers for each sample, measurement and change in the system.
                    This allows your data to natively follow the FAIR data principle philosophy: Findable, Accessible, Interoperable and Reusable data.
                  </p>
                </div>
              </div>
              <Card className="w-full h-[300px] overflow-auto p-4">
                <Image
                  src={gofairlogo}
                  alt="GO FAIR logo"
                  className="align-middle"
                />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}