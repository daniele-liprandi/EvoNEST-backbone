"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";

import { NewQuantities } from "@/components/forms/NewQuantities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useConfigTypes } from "@/hooks/useConfigTypes";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { prepend_path } from "@/lib/utils";
import dataFormatParserRegistry from "@/utils/file-management/readable-data-extractors/registry";
import type {
  GeneratedTrait,
  ParserDescription,
} from "@/utils/file-management/readable-data-extractors/types";
import {
  applyQuantityChoices,
  knownQuantities,
  type NewQuantity,
  type QuantityChoice,
} from "@/utils/file-management/quantity-mapping";
import type { LabelType } from "@/utils/types";

const FAMILIES: { value: ParserDescription["family"]; label: string }[] = [
  { value: "mechanics", label: "Mechanics" },
  { value: "logging", label: "Data loggers" },
  { value: "generic", label: "Generic tables" },
];

type StoredQuantity = { quantity: string; count: number };

// "map" also moves the traits already stored under the parser's name
async function saveChoices(
  traitquantities: LabelType[],
  newTypes: NewQuantity[],
  choices: Record<string, QuantityChoice>,
): Promise<boolean> {
  const next = applyQuantityChoices(traitquantities, newTypes, choices);
  if (!next) return true;
  const res = await fetch(`${prepend_path}/api/config/types`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      method: "update",
      type: "traitquantities",
      data: next,
    }),
  });
  if (!res.ok) return false;
  for (const type of newTypes) {
    const choice = choices[type.value] ?? { action: "add" };
    if (choice.action !== "map") continue;
    const moved = await fetch(`${prepend_path}/api/traits/quantities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: type.value, to: choice.to }),
    });
    if (!moved.ok) return false;
  }
  return true;
}

function TraitStatus({
  trait,
  traitquantities,
}: {
  trait: GeneratedTrait;
  traitquantities: LabelType[];
}) {
  if (traitquantities.some((t) => t.value === trait.value)) {
    return <Badge variant="secondary">In Settings</Badge>;
  }
  const target = traitquantities.find((t) => t.aliases?.includes(trait.value));
  if (target)
    return <Badge variant="secondary">Stored as {target.label}</Badge>;
  return <Badge variant="outline">Not in Settings</Badge>;
}

function MissingTraitActions({
  trait,
  traitquantities,
  onSave,
}: {
  trait: GeneratedTrait;
  traitquantities: LabelType[];
  onSave: (choice: QuantityChoice) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onSave({ action: "add" })}
      >
        Add
      </Button>
      <Select onValueChange={(to) => onSave({ action: "map", to })}>
        <SelectTrigger
          className="h-8 w-40"
          aria-label={`Store ${trait.label} as`}
        >
          <SelectValue placeholder="Store as…" />
        </SelectTrigger>
        <SelectContent>
          {traitquantities.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ParserCard({
  parser,
  traitquantities,
  canEdit,
  onSave,
}: {
  parser: ParserDescription;
  traitquantities: LabelType[];
  canEdit: boolean;
  onSave: (trait: GeneratedTrait, choice: QuantityChoice) => void;
}) {
  const known = knownQuantities(traitquantities);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{parser.label}</CardTitle>
        <CardDescription>{parser.formatDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Technique</dt>
          <dd>
            <code>{parser.technique}</code>
          </dd>
          <dt className="text-muted-foreground">File types</dt>
          <dd>
            {[...new Set(parser.extensions.map((e) => e.toLowerCase()))].join(
              ", ",
            )}
          </dd>
          {parser.exampleFile && (
            <>
              <dt className="text-muted-foreground">Example</dt>
              <dd>
                <a
                  href={`${prepend_path}${parser.exampleFile}`}
                  download
                  className="underline"
                >
                  {parser.exampleFile.split("/").pop()}
                </a>
              </dd>
            </>
          )}
        </dl>
        {parser.dynamicTraits ? (
          <p className="text-sm text-muted-foreground">
            Each numeric column becomes a quantity named after its header.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>In this lab</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parser.generatedTraits.map((trait) => (
                  <TableRow key={trait.value}>
                    <TableCell>{trait.label}</TableCell>
                    <TableCell>
                      <code className="text-xs">{trait.value}</code>
                    </TableCell>
                    <TableCell>{trait.unit}</TableCell>
                    <TableCell>
                      {canEdit && !known.has(trait.value) ? (
                        <MissingTraitActions
                          trait={trait}
                          traitquantities={traitquantities}
                          onSave={(choice) => onSave(trait, choice)}
                        />
                      ) : (
                        <TraitStatus trait={trait} traitquantities={traitquantities} />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ParsersPage() {
  const parsers = useMemo(
    () => dataFormatParserRegistry.listParsers() as ParserDescription[],
    [],
  );
  const { traitquantities, refresh } = useConfigTypes();
  const { can, isUserLoading } = useCurrentUser();
  const canEdit = !isUserLoading && can("config.edit");
  const { data: stored, mutate: refreshStored } = useSWR<StoredQuantity[]>(
    `${prepend_path}/api/traits/quantities`,
  );
  const [choices, setChoices] = useState<Record<string, QuantityChoice>>({});
  const [saving, setSaving] = useState(false);

  const unknownStored = useMemo(() => {
    const known = knownQuantities(traitquantities);
    const declared = new Map(
      parsers.flatMap((p) => p.generatedTraits).map((t) => [t.value, t]),
    );
    return (stored ?? [])
      .filter((s) => !known.has(s.quantity))
      .map((s) => ({
        value: s.quantity,
        label: declared.get(s.quantity)?.label ?? s.quantity,
        unit: `${s.count} trait${s.count > 1 ? "s" : ""}`,
        description: declared.get(s.quantity)?.description ?? "",
        unitForConfig: declared.get(s.quantity)?.unit ?? "",
      }));
  }, [stored, traitquantities, parsers]);

  const run = async (
    newTypes: NewQuantity[],
    next: Record<string, QuantityChoice>,
  ) => {
    setSaving(true);
    try {
      const okay = await saveChoices(traitquantities, newTypes, next);
      if (okay) {
        toast.success("Quantities saved");
        setChoices({});
      } else {
        toast.error("Could not save the quantities");
      }
    } finally {
      refresh();
      refreshStored();
      setSaving(false);
    }
  };

  return (
    <section className="w-full py-12 md:py-16">
      <div className="container flex flex-col gap-6 px-4 md:gap-8 md:px-6">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Parsers
        </h1>

        {unknownStored.length > 0 && (
          <Card>
            <CardContent className="space-y-3 pt-6">
              <NewQuantities
                heading={`${unknownStored.length} stored ${unknownStored.length > 1 ? "quantities are" : "quantity is"} not in Settings`}
                newTypes={unknownStored}
                traitquantities={traitquantities}
                canEdit={isUserLoading ? undefined : canEdit}
                choices={choices}
                onChange={(value, choice) =>
                  setChoices((prev) => ({ ...prev, [value]: choice }))
                }
                note={
                  <p className="text-xs text-muted-foreground">
                    Storing one as an existing quantity also moves the traits
                    already saved under its name.
                  </p>
                }
                readOnlyNote={
                  <p className="text-sm text-muted-foreground">
                    Someone with configuration rights can resolve them here.
                  </p>
                }
              />
              {canEdit && (
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={() =>
                    run(
                      unknownStored.map(({ unitForConfig, ...t }) => ({
                        ...t,
                        unit: unitForConfig,
                      })),
                      choices,
                    )
                  }
                >
                  Save
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {FAMILIES.map((family) => {
          const inFamily = parsers.filter((p) => p.family === family.value);
          if (inFamily.length === 0) return null;
          return (
            <section key={family.value} className="space-y-3">
              <h2 className="text-lg font-semibold">{family.label}</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {inFamily.map((parser) => (
                  <ParserCard
                    key={parser.name}
                    parser={parser}
                    traitquantities={traitquantities}
                    canEdit={canEdit && !saving}
                    onSave={(trait, choice) =>
                      run([trait], { [trait.value]: choice })
                    }
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
