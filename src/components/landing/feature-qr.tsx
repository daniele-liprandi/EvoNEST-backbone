"use client";

import Marquee from "../magicui/marquee";
import WordFadeIn from "../magicui/word-fade-in";
import qr1 from "@/images/qrs/QR1.png";
import qr2 from "@/images/qrs/QR2.png";
import qr3 from "@/images/qrs/QR3.png";
import { cn } from "@/lib/utils";
import Image from "next/image";

const qrs = [
  {
    title: "qr1",
    src: qr1,
  },
  {
    title: "qr2",
    src: qr2,
  },
  {
    title: "qr3",
    src: qr3,
  },
];

export function FeatureQR() {
  return (
    <section id="feature-qr">
      <div className="py-14">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="text-left">
                <WordFadeIn
                  className="text-4xl font-bold tracking-tight text-black dark:text-white sm:text-6xl"
                  words="Connect your real world object with their digital entries"
                />
                <div className="container mx-auto my-12 max-w-[600px] space-y-12">
                  <p className="mb-4 text-left text-base font-semibold tracking-tight text-foreground/60">
                    Every digital entry in EvoNEST is connected to a QR code, which can be easily printed thanks to automatically generated labels.
                    This way, you can quickly access the digital information of the sample by scanning the QR code with your phone or PC.
                    When shipping samples to other labs, these labels assure that everyone can access the digital information of the sample.
                  </p>
                </div>
              </div>
              <div className="relative h-96 overflow-hidden rounded-lg shadow-xl ">
                <Marquee 
                  className={cn(
                    "h-full justify-center space-y-2 overflow-hidden [--duration:60s] [--gap:1rem]",
                    "[mask-image:linear-gradient(to_bottom,transparent_0%,black_20%,black_80%,transparent_100%)]"
                  )}
                  vertical
                >
                  {qrs.map((data, idx) => (
                    <Image
                      key={idx}
                      src={data.src}
                      alt={data.title}
                      className="mx-auto h-auto w-2/3 cursor-pointer rounded-xl border border-neutral-300 transition-all duration-300 hover:ring-1 hover:ring-neutral-300"
                    />
                  ))}
                </Marquee>
                <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background"></div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
