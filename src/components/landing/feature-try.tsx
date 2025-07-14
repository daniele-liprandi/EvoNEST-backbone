"use client";

import Link from "next/link";
import TypingAnimation from "../magicui/typing-animation";
import ShimmerButton from "../magicui/shimmer-button";
import WordFadeIn from "../magicui/word-fade-in";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

export function FeatureTry() {
  return (
    <section id="feature-try">
      <div className="py-14">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <h4 className="text-xl font-bold tracking-tight text-black dark:text-white">
              Try it now!
            </h4>
            <WordFadeIn
              className="text-4xl font-bold tracking-tight text-black dark:text-white sm:text-6xl"
              words="Explore a demo NEST"
            />
          </div>
          <div className="container mx-auto my-12 max-w-[600px] space-y-12">
            <section>
              <p className="mb-4 text-left text-base font-semibold tracking-tight text-foreground/60">
                <strong>Login into a demo NEST</strong> with the <strong>credentials below</strong> to explore the features of EvoNEST with your own mouse.
              </p>
              <div className="mb-4 space-x-3">
                <Label>Username</Label>
                <Input type="text" placeholder="demo" defaultValue="demo" readOnly />
              </div>
              <div className="mb-4 space-x-3">
                <Label>Password</Label>
                <Input type="text" placeholder="Demonest0" defaultValue="Demonest0" readOnly />
              </div>
              <p className="mb-4 text-left text-base font-semibold tracking-tight text-foreground/60">
                The demo NEST contains a sample of data based on an hypothetical collaboration between spider silk labs.<br />
                This NEST contains animals of the Arachnida class, and samples can be of two types, animals or collected silks.
                The data arrangement and the visualisation features focuses on a comparative analysis of the mechanical and geometrical properties of the silks.<br />
                All that you see, including the initial dashboard and the types of samples, can be tailored to your own needs.
              </p>
              <div className="mt-12 flex justify-center translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms] mb-8">
                <Link href="/home">
                  <ShimmerButton className="shadow-2xl">
                    <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
                      Try a demo NEST
                    </span>
                  </ShimmerButton>
                </Link>
              </div>
              <div className="mt-12 flex justify-center translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms] mb-8">
                <p>
                We love feedback! Fill out the form and help us design the future features of EvoNEST.
                </p>
              </div>
              <div className="mt-12 flex justify-center translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms] mb-8">
                <Link href="https://form.jotform.com/241713541681050">
                  <ShimmerButton className="shadow-2xl">
                    <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
                      Help us make EvoNEST better
                    </span>
                  </ShimmerButton>
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section >
  );
}
