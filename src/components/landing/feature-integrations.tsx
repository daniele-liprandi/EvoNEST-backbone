"use client";

import WordFadeIn from "../magicui/word-fade-in";

const feature = [
  {
    title: "General",
    description: "One important power of EvoNEST is the native ability to communicate with other web-tools through APIs. EvoNEST started as a data-driven project for a lab focused on spiders and spider silks, and we already provide all the code necessary to integrate the Global Name Resolver, the Global Biodiversity Information Facility, and the World Spider Catalogue. This is just the beginning, as we are working on integrating more databases and APIs to make EvoNEST the best tool for every collection.",
  },
];

export function FeatureIntegrations() {
  return (
    <section id="feature-integrations">
      <div className="py-14">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <WordFadeIn
              className="text-4xl font-bold tracking-tight text-black dark:text-white sm:text-6xl"
              words="Integrate with what you need"
            />
          </div>
          <div className="container mx-auto my-12 max-w-[600px] space-y-12">
            {feature.map((faq, idx) => (
              <section key={idx} id={"faq-" + faq.title}>
                <p className="mb-4 text-left text-base font-semibold tracking-tight text-foreground/60">
                  {faq.description}
                </p>
              </section>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
