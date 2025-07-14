// TODO DELETE IN THIS VERSION

import { cn } from "@/lib/utils";
import { forwardRef, useRef } from "react";
import { PiBug, PiRuler, PiComputerTowerBold, PiCarrotBold, PiGlobeBold, PiUserBold, PiNewspaperBold } from "react-icons/pi";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import { InputIcon } from "@radix-ui/react-icons";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { FileTextIcon, Share2Icon, QrCodeIcon, HandshakeIcon, SheetIcon, ScatterChartIcon, LibraryBigIcon, PackageIcon, TreesIcon, WrenchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Marquee from "@/components/magicui/marquee";

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-12 items-center justify-center rounded-full border-2 border-border p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
        "bg-white dark:bg-gray-800", // Light background for light mode, dark for dark mode
        "text-gray-800 dark:text-white", // Dark text for light mode, white for dark mode
        className
      )}
    >
      {children}
    </div>
  );
});

Circle.displayName = "Circle";

export function DataBaseIntegrationCard({
  className,
}: {
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const div1Ref = useRef<HTMLDivElement>(null);
  const div2Ref = useRef<HTMLDivElement>(null);
  const div3Ref = useRef<HTMLDivElement>(null);
  const div4Ref = useRef<HTMLDivElement>(null);
  const div5Ref = useRef<HTMLDivElement>(null);
  const div6Ref = useRef<HTMLDivElement>(null);
  const div7Ref = useRef<HTMLDivElement>(null);

  return (
    <div
      className={cn(
        "relative flex h-[400px] w-full items-center justify-center overflow-hidden rounded-lg border bg-background p-10 md:shadow-xl",
        className,
      )}
      ref={containerRef}
    >
      <div className="flex size-full flex-row items-stretch justify-between gap-10 max-w-lg">
        <div className="flex flex-col justify-center gap-2">
          <Circle ref={div1Ref}>
            <PiBug />
          </Circle>
          <Circle ref={div2Ref}>
            <PiRuler />
          </Circle>
          <Circle ref={div3Ref}>
            <PiComputerTowerBold />
          </Circle>
          <Circle ref={div4Ref}>
            <PiCarrotBold />
          </Circle>
          <Circle ref={div5Ref}>
            <PiGlobeBold />
          </Circle>
        </div>
        <div className="flex flex-col justify-center">
          <Circle ref={div6Ref} className="size-16">
            <PiUserBold />
          </Circle>
        </div>
        <div className="flex flex-col justify-center">
          <Circle ref={div7Ref}>
            <PiNewspaperBold />
          </Circle>
        </div>
      </div>

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div2Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div3Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div4Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div5Ref}
        toRef={div6Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div6Ref}
        toRef={div7Ref}
      />
    </div>
  );
}

export function UserIntegrationCard({
  className,
}: {
  className?: string;
}) {
  const containerRefUser = useRef<HTMLDivElement>(null);
  const div1RefUser = useRef<HTMLDivElement>(null);
  const div2RefUser = useRef<HTMLDivElement>(null);
  return (
    <div
      className={cn(
        "relative flex h-[500px] w-full items-center justify-center overflow-hidden rounded-lg border bg-background p-10 md:shadow-xl",
        className,
      )}
      ref={containerRefUser}
    >
      <div className="flex size-full flex-row items-stretch justify-between gap-10 max-w-lg">
        <div className="flex flex-col justify-center gap-2">
          <Circle ref={div1RefUser} className="size-16">
            <PiUserBold />
          </Circle>
        </div>
        <div className="flex flex-col justify-center">
          <Circle ref={div2RefUser} className="size-16">
            <PiUserBold />
          </Circle>
        </div>
      </div>
      <AnimatedBeam
        containerRef={containerRefUser}
        fromRef={div1RefUser}
        toRef={div2RefUser}
      />
    </div>
  );
}

const files = [
    {
      name: "animal_portugal",
      body: "Spider collected by Dr. A. M. Hirst in Portugal in 1933.",
    },
    {
      name: "Metabolic_rates.csv",
      body: "Metabolic rates of arachnida by Dr. John Doe",
    },
    {
      name: "scan01.jpg",
      body: "A scan of a spider specimen collected in 1933.",
    },
  ];
  

export const bentoLandingFeatures = [
    {
      Icon: FileTextIcon,
      name: "Keep track of your work",
      description: "EvoNEST stores all your data together with logs about what was modified and when.",
      href: "#feature-data",
      cta: "Learn more",
      className: "col-span-3 lg:col-span-1",
      background: (
        <Marquee
          pauseOnHover
          className="absolute top-10 [--duration:20s] [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] "
        >
          {files.map((f, idx) => (
            <figure
              key={idx}
              className={cn(
                "relative w-32 cursor-pointer overflow-hidden rounded-xl border p-4",
                "border-gray-950/[.1] bg-gray-950/[.01] hover:bg-gray-950/[.05]",
                "dark:border-gray-50/[.1] dark:bg-gray-50/[.10] dark:hover:bg-gray-50/[.15]",
                "transform-gpu blur-[1px] transition-all duration-300 ease-out hover:blur-none",
              )}
            >
              <div className="flex flex-row items-center gap-2">
                <div className="flex flex-col">
                  <figcaption className="text-sm font-medium dark:text-white ">
                    {f.name}
                  </figcaption>
                </div>
              </div>
              <blockquote className="mt-2 text-xs">{f.body}</blockquote>
            </figure>
          ))}
        </Marquee>
      ),
    },
    {
      Icon: InputIcon,
      name: "Search through your NEST",
      description: "Look for samples based on name, date of collection and more.",
      href: "#feature-search",
      cta: "Learn more",
      className: "col-span-3 lg:col-span-2",
      background: (
        <Command className="absolute right-10 top-10 w-[70%] origin-top translate-x-0 border transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] group-hover:-translate-x-10">
          <CommandInput placeholder="Search through the NEST..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Suggestions">
              <CommandItem>Calligrapha_serpentina001</CommandItem>
              <CommandItem>Calligrapha_serpentina001_carapace</CommandItem>
              <CommandItem>Drilaster045</CommandItem>
              <CommandItem>Drilaster_wings.csv</CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      ),
    },
    {
      Icon: Share2Icon,
      name: "Integrations",
      description: "Import your data and integrate it with external databases, like GBIF, WSC and more.",
      href: "#feature-integrations",
      cta: "Learn more",
      className: "col-span-3 lg:col-span-2",
      background: (
        <DataBaseIntegrationCard className="absolute right-2 top-4 h-[300px] w-[600px] border-none transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] group-hover:scale-105" />
      ),
    },
    {
      Icon: QrCodeIcon,
      name: "QR codes",
      description: "Connect your physical objects with data entries using barcode labels.",
      className: "col-span-3 lg:col-span-1",
      href: "#feature-qr",
      cta: "Learn more",
      background: (
        <div className='grid grid-cols-2 gap-2'>
          <Button
            variant='secondary'
            size='lg'
            className='border-none transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] '
          >Feed animals
          </Button>
          <Button
            variant='default'
            size='lg'
            className='border-none transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] '
          >Go to Sample
          </Button>
        </div>
      ),
    },
    {
      Icon: HandshakeIcon,
      name: "Data sharing",
      description: "Data can easily be shared with collaborators. You control who can access it. ",
      href: "#feature-sharing",
      cta: "Learn more",
      className: "col-span-3 lg:col-span-1",
      background: (
        <UserIntegrationCard className="absolute right-2 top-4 h-[300px] w-[300px] border-none transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] group-hover:scale-105" />
      ),
    },
    {
      Icon: SheetIcon,
      name: "Data export",
      description: "Export your data in your favourite format - ready for your analysis and repository upload with just one click.",
      className: "col-span-3 lg:col-span-1",
      href: "#feature-export",
      cta: "Learn more",
      background: (
        <div className="absolute right-1 top-1 border-none transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)]">
          <div className='grid grid-cols-3 gap-2 p-1'>
            <Button variant="default" size="sm">Download Excel</Button>
            <Button variant="outline" size="sm">Download CSV</Button>
            <Button variant="outline" size="sm">Download JSON</Button>
          </div>
        </div>
      ),
    },
    {
      Icon: ScatterChartIcon,
      name: "Data visualisation",
      description: "Quick and easy live visualisations of your collection state and trait analysis.",
      className: "col-span-3 lg:col-span-1",
      href: "#feature-plot",
      cta: "Learn more",
      background: (
        <div className="flex items-center justify-end space-x-2 py-4">
        </div>
      ),
    },
    /* I want to insert
    Specimen maintenance
    Speed up the documentation of your animal husbandry, plant culture and specimen collections with convenience functions

    Your helper in the field
    Access your NEST anywhere via your mobile device and record your location and time with one click when collecting specimens or data in the field

    Modularity
    Use a nested sampling structure, set up experimental groups or add new analysis tools - all is possible thanks to the modular structure of EvoNEST
     */
    {
      Icon: WrenchIcon,
      name: "Specimen maintenance",
      description: "Speed up the documentation of your animal husbandry, plant culture and specimen collections with convenience functions.",
      className: "col-span-3 lg:col-span-1",
      href: "#feature-specimen",
      cta: "",
      background: (
        <div className="flex items-center justify-end space-x-2 py-4">
        </div>
      ),
    },
    {
      Icon: TreesIcon,
      name: "Your helper in the field",
      description: "Access your NEST anywhere via your mobile device and record your location and time with one click when collecting specimens or data in the field.",
      className: "col-span-3 lg:col-span-1",
      href: "#feature-field",
      cta: "",
      background: (
        <div className="flex items-center justify-end space-x-2 py-4">
        </div>
      ),
    },
    {
      Icon: PackageIcon,
      name: "Modularity",
      description: "Use a nested sampling structure, set up experimental groups or add new analysis tools - all is possible thanks to the modular structure of EvoNEST.",
      className: "col-span-3 lg:col-span-1",
      href: "#feature-modularity",
      cta: "",
      background: (
        <div className="flex items-center justify-end space-x-2 py-4">
        </div>
      ),
    },
  ];