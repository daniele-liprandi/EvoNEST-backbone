"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfigTypes } from "@/hooks/useConfigTypes";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { prepend_path } from "@/lib/utils";
import dataFormatParserRegistry from "@/utils/file-management/readable-data-extractors/registry";
import type { ParserDescription } from "@/utils/file-management/readable-data-extractors/types";
import type { Protocol } from "@/utils/types";
import { ProtocolEditor } from "./protocol-editor";

const KEY = `${prepend_path}/api/config/types?type=protocols`;

export default function ProtocolsPage() {
  const { data, mutate } = useSWR<{ data?: Protocol[] } | null>(KEY);
  const protocols = data?.data ?? [];
  const { sampletypes, traitquantities, equipmenttypes } = useConfigTypes();
  const { can, isUserLoading } = useCurrentUser();
  const canEdit = !isUserLoading && can("config.edit");
  const techniques = useMemo(
    () => dataFormatParserRegistry.listParsers() as ParserDescription[],
    [],
  );
  // `null` opens the editor on a new protocol
  const [editing, setEditing] = useState<Protocol | null | undefined>(undefined);

  const labelOf = (list: { value: string; label: string }[], value: string) =>
    list.find((x) => x.value === value)?.label ?? value;

  const write = async (next: Protocol[]) => {
    const res = await fetch(`${prepend_path}/api/config/types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: "update", type: "protocols", data: next }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return (body.error ?? body.message ?? "Could not save the protocols").split("; ").join("\n");
    }
    await mutate();
    return null;
  };

  const save = (protocol: Protocol, previousValue: string | null) =>
    write(
      previousValue === null
        ? [...protocols, protocol]
        : protocols.map((p) => (p.value === previousValue ? protocol : p)),
    );

  const remove = async (protocol: Protocol) => {
    if (!confirm(`Delete ${protocol.label}?`)) return;
    const message = await write(protocols.filter((p) => p.value !== protocol.value));
    if (message) toast.error(message);
  };

  return (
    <section className="w-full py-12 md:py-16">
      <div className="container flex flex-col gap-6 px-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">Protocols</h1>
          {canEdit && (
            <Button onClick={() => setEditing(null)}>
              <Plus className="mr-1 size-4" /> New protocol
            </Button>
          )}
        </div>

        {data !== undefined && protocols.length === 0 && (
          <p className="text-sm text-muted-foreground">No protocols yet.</p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {protocols.map((protocol) => (
            <Card key={protocol.value} className="min-w-0">
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="min-w-0 space-y-1">
                  <CardTitle>{protocol.label}</CardTitle>
                  {protocol.description && (
                    <p className="text-sm text-muted-foreground">{protocol.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {protocol.appliesToSampleTypes.length
                      ? protocol.appliesToSampleTypes.map((t) => labelOf(sampletypes, t)).join(", ")
                      : "Every sample type"}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${protocol.label}`} onClick={() => setEditing(protocol)}>
                      <PencilSimple className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${protocol.label}`} onClick={() => remove(protocol)}>
                      <Trash className="size-4" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {protocol.steps.map((step, i) => (
                    <li key={step.key} className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{i + 1}.</span>
                        <span className="font-medium">{step.label}</span>
                        <Badge variant="outline">{step.kind === "measurement" ? "Measurement" : "Procedure"}</Badge>
                        {step.optional && <Badge variant="secondary">Optional</Badge>}
                        {step.repeatable && (
                          <Badge variant="secondary">
                            Repeats as {step.repeatAs === "label" ? "labels" : "subsamples"}
                          </Badge>
                        )}
                      </div>
                      <div className="pl-5 text-xs text-muted-foreground">
                        {step.kind === "measurement" && (
                          <div>
                            {step.technique ?? "Entered by hand"}
                            {step.expectedQuantities?.length
                              ? `: ${step.expectedQuantities.map((q) => labelOf(traitquantities, q)).join(", ")}`
                              : ""}
                          </div>
                        )}
                        {step.params.length > 0 && <div>{step.params.map((p) => p.label).join(", ")}</div>}
                        {step.equipmentTypes.length > 0 && (
                          <div>{step.equipmentTypes.map((e) => labelOf(equipmenttypes, e)).join(", ")}</div>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {editing !== undefined && (
        <ProtocolEditor
          key={editing?.value ?? "new"}
          protocol={editing}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
          sampleTypes={sampletypes}
          quantities={traitquantities}
          equipment={equipmenttypes}
          techniques={techniques}
          onSave={save}
        />
      )}
    </section>
  );
}
