"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash, MagnifyingGlass, Bug, Flask, Ruler, DownloadSimple } from "@phosphor-icons/react";

import { Section, Row, HslSwatch, ThemeBar, THEMES } from "./_parts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

const SURFACE_TOKENS = [
  "--background",
  "--foreground",
  "--card",
  "--muted",
  "--muted-foreground",
  "--border",
  "--primary",
  "--secondary",
  "--accent",
  "--destructive",
];

const CATEGORICAL = [
  "green", "teal", "cyan", "blue", "purple", "pink",
  "red", "orange", "yellow", "brown", "gray", "black",
] as const;

const RADII = [
  ["--radius-sm", "rounded-sm"],
  ["--radius-md", "rounded-md"],
  ["--radius-lg", "rounded-lg"],
  ["--radius-xl", "rounded-xl"],
] as const;

const SHADOWS = ["shadow-xs", "shadow-sm", "shadow-md", "shadow-lg", "shadow-xl"] as const;

const NAV = [
  ["foundations", "Foundations"],
  ["buttons", "Buttons"],
  ["badges", "Badges"],
  ["forms", "Form controls"],
  ["surfaces", "Surfaces"],
  ["overlays", "Overlays"],
  ["data", "Data"],
  ["assembled", "Assembled"],
] as const;

export default function DesignPage() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="mx-auto max-w-5xl px-5 pb-32 sm:px-8">
        <header className="flex flex-col gap-6 py-14">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">EvoNEST</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Design</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              The component set and every theme, rendered by the real code. Switch themes and
              scroll to see what the app feels like.
            </p>
          </div>
          <ThemeBar />
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="text-muted-foreground hover:text-foreground">
                {label}
              </a>
            ))}
          </nav>
        </header>

        <Section
          id="foundations"
          title="Foundations"
          intro="The design tokens. Every value here follows the active theme."
        >
          <div>
            <h3 className="mb-3 text-sm font-semibold">Surfaces</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {SURFACE_TOKENS.map((t) => (
                <HslSwatch key={t} token={t} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Categorical palette</h3>
            <p className="mb-3 text-xs text-muted-foreground">
              Charts and the coloured <code>Badge</code> variants.
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {CATEGORICAL.map((c) => (
                <div key={c} className="flex flex-col gap-1.5">
                  <div
                    className="h-14 w-full rounded-md border border-border"
                    style={{ background: `var(--${c})` }}
                  />
                  <span className="font-mono text-[11px] text-foreground">--{c}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Type scale</h3>
            <div className="flex flex-col gap-2">
              <p className="text-4xl font-bold tracking-tight lg:text-5xl">Heading one</p>
              <p className="text-3xl font-bold tracking-tight lg:text-4xl">Heading two</p>
              <p className="text-2xl font-bold tracking-tight lg:text-3xl">Heading three</p>
              <p className="text-base">
                Body text in Atkinson Hyperlegible Next. Open apertures, sturdy body, picked for
                legibility in a data-dense tool. The quick brown fox jumps over the lazy dog.
              </p>
              <p className="text-sm text-muted-foreground">Small / secondary text.</p>
              <p className="font-mono text-sm">Mono: 0123456789. IDs, counts, tokens.</p>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold">Radius</h3>
              <div className="flex flex-wrap gap-4">
                {RADII.map(([token, cls]) => (
                  <div key={token} className="flex flex-col items-center gap-1.5">
                    <div className={`size-16 border-2 border-primary bg-primary/10 ${cls}`} />
                    <span className="font-mono text-[11px] text-muted-foreground">{token}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold">Elevation</h3>
              <div className="flex flex-wrap gap-4">
                {SHADOWS.map((cls) => (
                  <div key={cls} className="flex flex-col items-center gap-1.5">
                    <div className={`size-16 rounded-lg border border-border bg-card ${cls}`} />
                    <span className="font-mono text-[11px] text-muted-foreground">{cls}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="buttons"
          title="Buttons"
        >
          <Row label="Variants">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </Row>
          <Row label="Sizes">
            <Button size="xs">Extra small</Button>
            <Button size="sm">Small</Button>
            <Button>Default</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row label="With icon">
            <Button>
              <Plus /> New sample
            </Button>
            <Button variant="outline">
              <DownloadSimple /> Export
            </Button>
            <Button variant="ghost" size="icon" aria-label="Search">
              <MagnifyingGlass />
            </Button>
            <Button variant="destructive" size="icon-sm" aria-label="Delete">
              <Trash />
            </Button>
          </Row>
          <Row label="Disabled">
            <Button disabled>Default</Button>
            <Button variant="outline" disabled>
              Outline
            </Button>
          </Row>
        </Section>

        <Section id="badges" title="Badges" intro="Semantic and categorical variants.">
          <Row label="Semantic">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </Row>
          <Row label="Categorical">
            {CATEGORICAL.map((c) => (
              <Badge key={c} variant={c}>
                {c}
              </Badge>
            ))}
          </Row>
        </Section>

        <Section id="forms" title="Form controls">
          <div className="grid max-w-xl gap-5">
            <div className="grid gap-2">
              <Label htmlFor="d-name">Sample name</Label>
              <Input id="d-name" placeholder="An_Pha_001" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="d-notes">Notes</Label>
              <Textarea id="d-notes" placeholder="Anything worth recording" rows={3} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="d-err">Latitude</Label>
              <Input id="d-err" defaultValue="not a number" aria-invalid="true" />
              <p className="text-sm text-destructive">Enter a number between -90 and 90.</p>
            </div>
            <div className="grid gap-2">
              <Label>Sample type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="animal">Animal</SelectItem>
                  <SelectItem value="silk">Silk</SelectItem>
                  <SelectItem value="tissue">Tissue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="d-check" defaultChecked />
              <Label htmlFor="d-check">Include shortened form in the ID</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="d-switch" defaultChecked />
              <Label htmlFor="d-switch">Collision avoidance</Label>
            </div>
            <div className="grid gap-2">
              <Label>Number padding</Label>
              <Slider defaultValue={[2]} max={5} step={1} />
            </div>
          </div>
        </Section>

        <Section id="surfaces" title="Surfaces">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Araneus diadematus</CardTitle>
                <CardDescription>Animal · collected 2024-08-14</CardDescription>
                <CardAction>
                  <Button variant="ghost" size="icon-sm" aria-label="More">
                    <Plus />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Card follows <code>--radius</code>, so the edge theme squares it, and the shadow
                token hardens.
              </CardContent>
              <CardFooter className="gap-2">
                <Button size="sm">Open</Button>
                <Button size="sm" variant="outline">
                  Subsamples
                </Button>
              </CardFooter>
            </Card>

            <div className="flex flex-col gap-6">
              <Tabs defaultValue="general">
                <TabsList>
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="animal">Animal</TabsTrigger>
                </TabsList>
                <TabsContent value="general" className="pt-3 text-sm text-muted-foreground">
                  Tab panel content.
                </TabsContent>
                <TabsContent value="details" className="pt-3 text-sm text-muted-foreground">
                  Details panel.
                </TabsContent>
                <TabsContent value="animal" className="pt-3 text-sm text-muted-foreground">
                  Animal panel.
                </TabsContent>
              </Tabs>

              <Accordion type="single" collapsible>
                <AccordionItem value="a">
                  <AccordionTrigger>What is a subsample?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    A sample derived from a parent sample: silk from an animal, or tissue from a
                    specimen.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="b">
                  <AccordionTrigger>How are IDs generated?</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    From genus and species prefixes plus a running number, per the main settings.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          <Alert>
            <AlertTitle>Heads up</AlertTitle>
            <AlertDescription>
              Lab location is not configured. Set it in Settings → Main.
            </AlertDescription>
          </Alert>
        </Section>

        <Section id="overlays" title="Overlays">
          <Row label="Trigger">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New experiment</DialogTitle>
                  <DialogDescription>Fill in the details for the experiment.</DialogDescription>
                </DialogHeader>
                <div className="text-sm text-muted-foreground">Form would go here.</div>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Bug /> New sample
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Flask /> New experiment
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Ruler /> New trait
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Popover</Button>
              </PopoverTrigger>
              <PopoverContent className="text-sm text-muted-foreground">
                Small floating panel, same surface and border tokens.
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover for tooltip</Button>
              </TooltipTrigger>
              <TooltipContent>Recently changed</TooltipContent>
            </Tooltip>

            <Button variant="outline" onClick={() => toast.success("Sample saved")}>
              Fire a toast
            </Button>
          </Row>
        </Section>

        <Section id="data" title="Data">
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead className="text-right">Traits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ["An_Pha_001", "animal", "Marzia", 12],
                  ["An_Pha_001_s1", "silk", "Daniele", 4],
                  ["An_Ara_007", "animal", "Marzia", 9],
                ].map(([name, type, who, n]) => (
                  <TableRow key={name as string}>
                    <TableCell className="font-mono text-xs">{name}</TableCell>
                    <TableCell>
                      <Badge variant={type === "animal" ? "green" : "blue"}>{type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{who}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{n}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Skeleton
              </span>
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Avatar · progress
              </span>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>MF</AvatarFallback>
                </Avatar>
                <Progress value={62} className="flex-1" />
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="assembled"
          title="Assembled"
          intro="The pieces together, closer to a real screen than the rows above."
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">New trait</CardTitle>
                <CardDescription>Record a measurement against a sample.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="a-sample">Sample</Label>
                  <Select>
                    <SelectTrigger id="a-sample">
                      <SelectValue placeholder="An_Pha_001" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">An_Pha_001</SelectItem>
                      <SelectItem value="2">An_Ara_007</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="a-val">Value</Label>
                    <Input id="a-val" placeholder="4.2" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="a-unit">Unit</Label>
                    <Input id="a-unit" defaultValue="µm" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button variant="ghost">Cancel</Button>
                <Button>
                  <Plus /> Save trait
                </Button>
              </CardFooter>
            </Card>

            <div className="flex flex-col gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Samples
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums">1,284</p>
                  <p className="mt-1 text-sm text-muted-foreground">42 genera · 118 spp.</p>
                </CardContent>
              </Card>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-sm">
                  <Bug className="text-muted-foreground" /> An_Pha_001
                </span>
                <Badge variant="green">verified</Badge>
              </div>
            </div>
          </div>
        </Section>

        <footer className="border-t border-border py-10 text-sm text-muted-foreground">
          Rendered by the app&rsquo;s own components and <code>globals.css</code>.{" "}
          {THEMES.map((t) => t.label).join(" · ")}.
        </footer>
      </div>
    </TooltipProvider>
  );
}
