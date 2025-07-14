"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import WordFadeIn from "../magicui/word-fade-in";

const faqs = [
  {
    section: "General",
    qa: [
      {
        question: "What is EvoNEST?",
        answer: (
          <span>
            EvoNEST is a powerful tool that allows you to track your collection of organisms, experiments, data, and traits.
            Every collection is separate and organised in NESTs. <br />
            A NEST is a Nexus of Experiments, Samples, Traits, data, and more. Everything happening in a NEST is accessible
            and logged: this way, you can share your NEST with others, and it will stay organised and accessible. <br />
          </span>
        ),
      },
      {
        question: "Who is EvoNEST for?",
        answer: (
          <span>
            EvoNEST is thought for people collecting every kind of organisms, from animal keepers to comparative biology labs,
            from natural history museums to botanists. You can use it to simply keep track
            of photos of your plants across the year, or to manage multiple experiments involving hundreds of individuals across different animal species and locations.
          </span>
        ),
      },
      {
        question: "Why should I use EvoNEST?",
        answer: (
          <span>
            Paper and digital notebooks all lack the features required to keep track of a collection in a consistent way.<br />
            It is hard to find a software that allows you to keep track of what happened to the organisms and their data in a uniform way.<br />
            We grew tired of managing different excel files, with different formats, being shared across different services;
            having important photos of our samples be identified using different nomenclatures;
            having a hard time telling our friends and colleagues across the globe what was our collection state, or how they could help us.<br />
            EvoNEST provides labs, museums and science enthusiasts a all-in-one solution to store and share all of their data,
            including measurements and analysis aimed for scientific research.<br />
          </span>
        ),
      },
      {
        question: "Is EvoNEST in active development?",
        answer: (
          <span>
            Yes, EvoNEST is in active development, and we are constantly adding new features and improving the existing ones.<br />
            The sample maintenance and organisation features are already stable, together with the measurement collection and the data storage.<br />
            However, we consider our software to be just at the beginning of its development, and we are looking forward to hear feedback on what features are the most needed by the community.<br />
          </span>
        ),
      },
      {
        question: "Is EvoNEST free to use?",
        answer: (
          <span>
            Yes, EvoNEST is free to use.
          </span>
        ),
      },
      {
        question: "How hard is it to set up EvoNEST?",
        answer: (
          <span>
            EvoNEST is easy to setup in its current configuration. If you need more features, you either need some web-app development knowledge, or to contact us for help.<br />
            The setup process is as simple as installing any other Node.js application. We are happy to help you with the setup process,
            so don&#39;t hesitate to contact us if you need help. If you are curious about what features we have already implemented and what we are working on,
            visit our Features page.
          </span>
        ),
      },
      {
        question: "How can I get started with EvoNEST?",
        answer: (
          <span>
            You can install EvoNEST on your own machines, and we are happy to help you do that. <br />
            The website you are on right now is hosted on our server, but it has some limitations, both in terms of speed and disk space available. <br />
            We are happy to help you set up EvoNEST, simply contact us on our social media or via email.
          </span>
        ),
      },

    ],
  },
  {
    section: "Technology",
    qa: [
      {
        question: "What is EvoNEST built upon?",
        answer: (
          <span>
            EvoNEST is built upon Next.js, Tailwind CSS, and React. <br />
            It uses only open source libraries and tools to ensure that you can easily customize and extend the application,
            deploy it to your own servers, and make it your own.
          </span>
        ),
      },
      {
        question: "Is EvoNEST safe?",
        answer: (
          <span>
            EvoNEST is as safe as the server on which it is running.<br />
            While we do not provide warranties or guarantees for your own systems, we are happy to help you set up EvoNEST in a secure way.<br />
            In any case, we built EvoNEST with security in mind, and we made backing up your data as easy as possible.            
          </span>
        ),
      }
    ],
  },
  {
    section: "Integration",
    qa: [
      {
        question: "How do I integrate EvoNEST with my existing workflow?",
        answer: (
          <span>
            EvoNEST is thought to be used without disrupting your entire workflow.<br />
            We are able to write ad-hoc scripts to import your data from other systems, and help you integrate EvoNEST with your existing tools.<br />
            All of your data is stored in a MongoDB database, so you can easily access it and use it in other applications.<br />
            All the tables can also be exported in XLSX, CSV, and JSON format, so that you can analyze your data with your favorite tools.
          </span>
        ),
      },
    ],
  },
];

export function FAQ() {
  return (
    <section id="faq">
      <div className="py-14">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <h4 className="text-xl font-bold tracking-tight text-black dark:text-white">
              FAQs
            </h4>
            <WordFadeIn
              className="text-4xl font-bold tracking-tight text-black dark:text-white sm:text-6xl"
              words="Frequently Asked Questions"
            />
            <p className="mt-6 text-xl leading-8 text-black/80 dark:text-white">
              Need help with something? Here are some of the most common
              questions we get.
            </p>
          </div>
          <div className="container mx-auto my-12 max-w-[600px] space-y-12">
            {faqs.map((faq, idx) => (
              <section key={idx} id={"faq-" + faq.section}>
                <h2 className="mb-4 text-left text-base font-semibold tracking-tight text-foreground/60">
                  {faq.section}
                </h2>
                <Accordion
                  type="single"
                  collapsible
                  className="flex w-full flex-col items-center justify-center"
                >
                  {faq.qa.map((faq, idx) => (
                    <AccordionItem
                      key={idx}
                      value={faq.question}
                      className="w-full max-w-[600px]"
                    >
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent>{faq.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
}
