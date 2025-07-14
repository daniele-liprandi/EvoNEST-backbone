"use client"


import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card"

import { DeveloperNewsCard } from "@/components/developer-cards/developer-news"
import { CardSamples } from "@/components/nest/dashboard/card-samples"
import { DemoDescription } from "@/components/nest/dashboard/demo-description"
import { NameCheckerCard } from "@/components/nest/dashboard/name-checker"
import PlotlyHierarchicalPlot from "@/components/plots/plotly-treemap"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import { useExperimentsData } from "@/hooks/useExperimentData"
import { useSampleData } from "@/hooks/useSampleData"
import { useTraitData } from "@/hooks/useTraitData"
import { useUserData } from "@/hooks/useUserData"
import { prepend_path } from "@/lib/utils"
import { useUser } from '@auth0/nextjs-auth0/client'
import { AspectRatio } from "@radix-ui/react-aspect-ratio"
import { useEffect, useState } from "react"
import { PiBug, PiGraphBold, PiRulerBold, PiUsersBold } from "react-icons/pi"
import { getPlotlyLabelBasedHierarchy } from "@/components/plots/plotly-treemap-data"
import MapboxScatterPlot from "@/components/plots/scatter-map"
import NumberTicker from "@/components/magicui/number-ticker"
import { useAuth } from "@/hooks/useAuth"
import { useConfigCheck } from '@/hooks/useConfigCheck'
import { ConfigSetup } from '@/components/config-setup'

export default function Home() {

  //import sampledata for the table
  const { samplesData, samplesError } = useSampleData(prepend_path, {
    revalidateIfStale: false,
    revalidateOnFocus: false, // Don't revalidate on window focus
    keepPreviousData: true, // Keep showing previous data while loading
  });
  const { usersData, usersError } = useUserData(prepend_path);
  const { traitsData, traitsError } = useTraitData(prepend_path);
  const { experimentsData, experimentsError } = useExperimentsData(prepend_path);
  const { session, isLoading } = useAuth();
  const [authuser, setAuthuser] = useState(session?.user);
  const { configExists, loading } = useConfigCheck()

  useEffect(() => {
    if (traitsData && samplesData && usersData && experimentsData) {

    }
  }, [traitsData, samplesData, usersData, experimentsData]);

  useEffect(() => {
    if (session) {
      console.log("session", session);
      setAuthuser(session.user);
    }
  } , [session]);

  // Show setup dialog on first visit if no config
  if (loading) {
    return <div>Loading...</div>
  }
  if (configExists === false) {
    return (
      <div className="container mx-auto py-8">
        <ConfigSetup onComplete={() => window.location.reload()} />
      </div>
    )
  }


  if (!samplesData || !usersData || !traitsData || !experimentsData) return (
    <div className="flex flex-col space-y-3">
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
  if (isLoading) return <div>Loading...</div>;

  if (samplesError) return <div>Error loading samples</div>;
  if (usersError) return <div>Error loading users</div>;
  if (traitsError) return <div>Error loading traits</div>;
  if (experimentsError) return <div>Error loading experiments</div>;

  let isThisADemo = false;
  if (authuser) {
    isThisADemo = authuser.name === "demo";
  }



  //sum of samples in the collection
  const totalSamples = samplesData.length;
  //sum of users in the collection
  const totalUsers = usersData.length;
  const totalExperiments = experimentsData.length;
  //sum of samples which are animals in the collection
  const totalAnimals = samplesData.filter((sample: { type: string; }) => sample.type === "animal").length;
  const uniqueGenus = new Set(samplesData.map((sample: { genus: any; }) => sample.genus)).size;
  const uniqueSpecies = new Set(samplesData.map((sample: { species: any; genus: any; }) => sample.genus + "" + sample.species)).size;

  const totalTraits = traitsData.length;
  const totalDiameters = traitsData.filter((trait: { type: string; }) => trait.type === "diameter").length;

  // Samples collected in the last 7 days
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const samplesLastWeek = samplesData.filter((sample: { date: string; }) => new Date(sample.date) > lastWeek).length;

  // Get ID of evonest user from the authentication user
  const evonestUser = usersData.find((user: { name: string; }) => user.name === (authuser?.name || "")) || { _id: "unknown" };
  // Get how many samples were collected by the evonest user in the alst week
  const samplesLastWeekByEvonestUser = samplesData.filter((sample: { responsible: string; date: string; }) => sample.responsible === evonestUser._id && new Date(sample.date) > lastWeek).length;

  function histogramDiameterDataCreator() {
    /* Create a lookup map for samplesData */
    const sampleLookup = samplesData.reduce((acc: { [x: string]: any }, sample: { _id: string | number }) => {
      acc[sample._id] = sample;
      return acc;
    }, {});

    /* Create the histogram data */
    const histogramDataMap = traitsData.filter((trait: { type: string }) => trait.type === "diameter").
      map((trait: { sampleId: string | number; type: any; measurement: any; detail: any; nfibres: any }) => {
        const sample = sampleLookup[trait.sampleId] || {};
        return {
          type: trait.type,
          measurement: trait.measurement,
          family: sample.family,
          genus: sample.genus,
          species: sample.genus + " " + sample.species,
          subsampletype: trait.detail || 'unknown',
          nfibres: trait.nfibres || 0,
          samplesubtype: sample.subsampletype || 'unknown',
        };
      });

    return histogramDataMap;

  }

  const histogramDataMap = histogramDiameterDataCreator();
  const subsampleData = samplesData.filter((sample: { type: string; }) => sample.type !== "animal");
  const animalData = samplesData.filter((sample: { type: string; }) => sample.type === "animal");

  const plotlybasedanimaldata = getPlotlyLabelBasedHierarchy(animalData, "treemap", ["family", "genus", "species"], "Animals");
  const plotlybasedsubsampledata = getPlotlyLabelBasedHierarchy(subsampleData, "treemap", ["family", "genus", "species", "type", "subsampletype"], "Subsamples");



  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {isThisADemo &&
          <div className="grid grid-cols-1">
            <DemoDescription />
          </div>
        }
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Users
              </CardTitle>
              <PiUsersBold className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <NumberTicker className="text-2xl font-bold" value={totalUsers} />
              <p className="text-xs text-muted-foreground">
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Samples
              </CardTitle>
              <PiBug className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <NumberTicker className="text-2xl font-bold" value={totalSamples} />
              <p className="text-xs text-muted-foreground">
                from {uniqueGenus} unique genus and from {uniqueSpecies} unique species
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Experiments</CardTitle>
              <PiGraphBold className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <NumberTicker className="text-2xl font-bold" value={totalExperiments} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Traits</CardTitle>
              <PiRulerBold className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <NumberTicker className="text-2xl font-bold" value={totalTraits} />
            </CardContent>
          </Card>
        </div>
        {/* ------------------------------- */}
        {/*            Second Row           */}
        {/* ------------------------------- */}
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-4">
          <Card className=" [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>The collection over the world</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-full">
                {samplesData && (
                  <MapboxScatterPlot samplesData={samplesData} />
                )}
              </div>
            </CardContent>
          </Card>
          <NameCheckerCard />
          <div className="flex flex-col space-y-2 h-full">
            <CardSamples data={samplesData} />
            <Card className=" [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Samples collected last week</CardTitle>
                <PiRulerBold className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <NumberTicker className="text-2xl font-bold" value={samplesLastWeek} />
                {evonestUser._id !== "unknown" &&
                  <p className="text-xs text-muted-foreground">
                    of which {samplesLastWeekByEvonestUser} by {evonestUser.name}
                  </p>
                }
              </CardContent>
            </Card>
          </div>
          <DeveloperNewsCard />
        </div>
        {/* ------------------------------- */}
        {/*            Third Row            */}
        {/* ------------------------------- */}
        <Accordion type="multiple">
          <AccordionItem value="item-1">
            <AccordionTrigger>Animal sampling state</AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Animal sampling state</CardTitle>
                  <PiRulerBold className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <AspectRatio ratio={2 / 1}>
                    <div className="h-full">
                      {plotlybasedanimaldata && (
                        <PlotlyHierarchicalPlot data={plotlybasedanimaldata} />
                      )}
                    </div>
                  </AspectRatio>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Subsample sampling state</AccordionTrigger>
            <AccordionContent>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Subsample sampling state</CardTitle>
                  <PiRulerBold className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <AspectRatio ratio={2 / 1}>
                    <div className="h-full">
                      {plotlybasedsubsampledata && (
                        <PlotlyHierarchicalPlot data={plotlybasedsubsampledata} />
                      )}
                    </div>
                  </AspectRatio>
                </CardContent>
              </Card>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>
    </div>
  )
}
