"use client";

import WordFadeIn from "../magicui/word-fade-in";
import { Card } from "@/components/ui/card";
import { File, Folder, Tree } from "@/components/magicui/file-tree";

const feature = [
  {
    title: "General",
    description: "EvoNEST doesn't only help you with your logs and tables, but also with your files. All your files are stored in your server, accessible to you and safe.",
  },
  {
    title: "Data",
    description: "Your data is accessible from anywhere you want, be it a local network or the entire web. You can access it from every device and every location, and download the data on the go. Every data inserted by a collaborator is immediately live in your NEST, so that you never miss important information.",
  }
  ];

const FILE_TREE = [
  {
    id: "1",
    isSelectable: true,
    name: "files",
    children: [
      {
        id: "2",
        isSelectable: true,
        name: "documents",
        children: [
          {
            id: "3",
            isSelectable: true,
            name: "report.pdf",
          },
          {
            id: "4",
            isSelectable: true,
            name: "spreadsheet.xlsx",
          },
        ],
      },
      {
        id: "5",
        isSelectable: true,
        name: "images",
        children: [
          {
            id: "6",
            isSelectable: true,
            name: "photo1.jpg",
          },
          {
            id: "7",
            isSelectable: true,
            name: "graphic.png",
          },
        ],
      },
      {
        id: "8",
        isSelectable: true,
        name: "videos",
        children: [
          {
            id: "9",
            isSelectable: true,
            name: "presentation.mp4",
          },
          {
            id: "10",
            isSelectable: true,
            name: "tutorial.mov",
          },
        ],
      },
    ],
  },
];

export function FeatureData() {
  return (
    <section id="feature-data">
      <div className="py-14">
        <div className="container mx-auto px-4 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <Card className="w-full h-[300px] overflow-auto p-4">
                <Tree
                  className="rounded-md bg-background"
                  initialSelectedId="1"
                  initialExpandedItems={["1", "2", "5", "8"]}
                  elements={FILE_TREE}
                >
                  <Folder element="files" value="1">
                    <Folder value="2" element="documents">
                      <File value="3">
                        <p>report.pdf</p>
                      </File>
                      <File value="4">
                        <p>spreadsheet.xlsx</p>
                      </File>
                    </Folder>
                    <Folder value="5" element="images">
                      <File value="6">
                        <p>photo1.jpg</p>
                      </File>
                      <File value="7">
                        <p>graphic.png</p>
                      </File>
                    </Folder>
                    <Folder value="8" element="videos">
                      <File value="9">
                        <p>irrigation.mp4</p>
                      </File>
                      <File value="10">
                        <p>behavioural.mov</p>
                      </File>
                    </Folder>
                  </Folder>
                </Tree>
              </Card>
              <div className="text-left">
                <WordFadeIn
                  className="text-4xl font-bold tracking-tight text-black dark:text-white sm:text-6xl mb-6"
                  words="Keep track of all your files"
                />
                <div className="space-y-6">
                  {feature.map((item, idx) => (
                    <section key={idx} id={`faq-${item.title}`}>
                      <p className="text-base font-semibold tracking-tight text-foreground/60">
                        {item.description}
                      </p>
                    </section>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}