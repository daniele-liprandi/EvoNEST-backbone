"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PARAM_KINDS } from "@/shared/config/protocols";
import { parseOptions } from "@/app/(nest)/settings/types/list-editor";
import type { ParserDescription } from "@/utils/file-management/readable-data-extractors/types";
import type { LabelType, Protocol, ProtocolParam, ProtocolStep } from "@/utils/types";

export const toKey = (label: string) =>
  label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "_$1");

const BY_HAND = "__by_hand";

type ParamDraft = ProtocolParam & { optionsText: string };
type StepDraft = Omit<ProtocolStep, "params"> & { params: ParamDraft[] };
type Draft = Omit<Protocol, "steps"> & { steps: StepDraft[] };

const newStep = (): StepDraft => ({
  key: "",
  label: "",
  kind: "procedure",
  params: [],
  equipmentTypes: [],
  optional: false,
  repeatable: false,
});

const toDraft = (p: Protocol): Draft => ({
  ...p,
  steps: p.steps.map((s) => ({
    ...s,
    params: s.params.map((pa) => ({
      ...pa,
      optionsText: (pa.options ?? []).map((o) => `${o.value}: ${o.label}`).join("\n"),
    })),
  })),
});

function fromDraft(d: Draft): Protocol {
  return {
    value: d.value,
    label: d.label.trim(),
    ...(d.description?.trim() ? { description: d.description.trim() } : {}),
    appliesToSampleTypes: d.appliesToSampleTypes,
    steps: d.steps.map((s) => {
      const step: ProtocolStep = {
        key: s.key || toKey(s.label),
        label: s.label.trim(),
        kind: s.kind,
        params: s.params.map(({ optionsText, ...pa }) => ({
          key: pa.key || toKey(pa.label),
          label: pa.label.trim(),
          kind: pa.kind,
          ...(pa.kind === "select" ? { options: parseOptions(optionsText) } : {}),
          ...(pa.description?.trim() ? { description: pa.description.trim() } : {}),
        })),
        equipmentTypes: s.equipmentTypes,
        optional: s.optional,
        repeatable: s.repeatable,
      };
      if (s.repeatable) step.repeatAs = s.repeatAs ?? "subsample";
      if (s.kind === "measurement") {
        step.technique = s.technique ?? null;
        step.expectedQuantities = s.expectedQuantities ?? [];
      }
      return step;
    }),
  };
}

function CheckList({
  items,
  selected,
  onChange,
}: {
  items: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <label key={item.value} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={selected.includes(item.value)}
            onCheckedChange={(on) =>
              onChange(on ? [...selected, item.value] : selected.filter((v) => v !== item.value))
            }
          />
          {item.label}
        </label>
      ))}
    </div>
  );
}

function ParamRow({
  param,
  onChange,
  onRemove,
}: {
  param: ParamDraft;
  onChange: (p: ParamDraft) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-md border p-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Label className="text-xs">Parameter</Label>
          <Input value={param.label} onChange={(e) => onChange({ ...param, label: e.target.value })} />
        </div>
        <div className="w-32 space-y-1">
          <Label className="text-xs">Kind</Label>
          <Select value={param.kind} onValueChange={(kind) => onChange({ ...param, kind: kind as ProtocolParam["kind"] })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PARAM_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label="Remove parameter" onClick={onRemove}>
          <Trash className="size-4" />
        </Button>
      </div>
      {param.kind === "select" && (
        <Textarea
          rows={3}
          aria-label="Options"
          placeholder={"forced: Forced silking\nnatural: Natural spinning"}
          value={param.optionsText}
          onChange={(e) => onChange({ ...param, optionsText: e.target.value })}
        />
      )}
    </div>
  );
}

function StepBlock({
  index,
  count,
  step,
  techniques,
  quantities,
  equipment,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  step: StepDraft;
  techniques: ParserDescription[];
  quantities: { value: string; label: string }[];
  equipment: { value: string; label: string }[];
  onChange: (s: StepDraft) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const parser = techniques.find((p) => p.technique === step.technique);
  const quantityItems = [
    ...quantities,
    ...(parser?.generatedTraits ?? [])
      .filter((t) => !quantities.some((q) => q.value === t.value))
      .map((t) => ({ value: t.value, label: t.label })),
  ];

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-end gap-2">
        <span className="pb-2 text-sm text-muted-foreground">{index + 1}.</span>
        <div className="min-w-0 flex-1 space-y-1">
          <Label className="text-xs">Step</Label>
          <Input
            value={step.label}
            placeholder="Measure diameter"
            onChange={(e) => onChange({ ...step, label: e.target.value })}
          />
        </div>
        <div className="w-36 space-y-1">
          <Label className="text-xs">Kind</Label>
          <Select
            value={step.kind}
            onValueChange={(kind) =>
              onChange(
                kind === "measurement"
                  ? { ...step, kind, technique: null, expectedQuantities: [] }
                  : { ...step, kind: "procedure", technique: undefined, expectedQuantities: undefined },
              )
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="procedure">Procedure</SelectItem>
              <SelectItem value="measurement">Measurement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="icon" aria-label="Move step up" disabled={index === 0} onClick={() => onMove(index - 1)}>
          <ArrowUp className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Move step down" disabled={index === count - 1} onClick={() => onMove(index + 1)}>
          <ArrowDown className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Remove step" onClick={onRemove}>
          <Trash className="size-4" />
        </Button>
      </div>

      {step.kind === "measurement" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs">Technique</Label>
            <Select
              value={step.technique ?? BY_HAND}
              onValueChange={(t) => onChange({ ...step, technique: t === BY_HAND ? null : t })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BY_HAND}>Values entered by hand</SelectItem>
                {techniques.flatMap((p) => (p.technique ? [p.technique] : [])).map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Expected quantities</Label>
            <CheckList
              items={quantityItems}
              selected={step.expectedQuantities ?? []}
              onChange={(expectedQuantities) => onChange({ ...step, expectedQuantities })}
            />
          </div>
        </>
      )}

      {equipment.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">Equipment types</Label>
          <CheckList
            items={equipment}
            selected={step.equipmentTypes}
            onChange={(equipmentTypes) => onChange({ ...step, equipmentTypes })}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={step.optional} onCheckedChange={(on) => onChange({ ...step, optional: !!on })} />
          Optional
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={step.repeatable}
            onCheckedChange={(on) =>
              onChange(on ? { ...step, repeatable: true, repeatAs: "subsample" } : { ...step, repeatable: false, repeatAs: undefined })
            }
          />
          Repeatable
        </label>
        {step.repeatable && (
          <Select
            value={step.repeatAs ?? "subsample"}
            onValueChange={(repeatAs) => onChange({ ...step, repeatAs: repeatAs as ProtocolStep["repeatAs"] })}
          >
            <SelectTrigger className="w-48" aria-label="Each repeat is">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subsample">Each repeat is a subsample</SelectItem>
              <SelectItem value="label">Each repeat is a label</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        {step.params.map((param, i) => (
          <ParamRow
            key={i}
            param={param}
            onChange={(p) => onChange({ ...step, params: step.params.map((x, j) => (j === i ? p : x)) })}
            onRemove={() => onChange({ ...step, params: step.params.filter((_, j) => j !== i) })}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({ ...step, params: [...step.params, { key: "", label: "", kind: "text", optionsText: "" }] })
          }
        >
          <Plus className="mr-1 size-4" /> Parameter
        </Button>
      </div>
    </div>
  );
}

export function ProtocolEditor({
  protocol,
  open,
  onOpenChange,
  sampleTypes,
  quantities,
  equipment,
  techniques,
  onSave,
}: {
  protocol: Protocol | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sampleTypes: LabelType[];
  quantities: LabelType[];
  equipment: LabelType[];
  techniques: ParserDescription[];
  onSave: (next: Protocol, previousValue: string | null) => Promise<string | null>;
}) {
  const isNew = protocol === null;
  const [draft, setDraft] = useState<Draft>(() =>
    protocol ? toDraft(protocol) : { value: "", label: "", appliesToSampleTypes: [], steps: [newStep()] },
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setStep = (i: number, s: StepDraft) => setDraft({ ...draft, steps: draft.steps.map((x, j) => (j === i ? s : x)) });
  const moveStep = (from: number, to: number) => {
    const steps = [...draft.steps];
    const [moved] = steps.splice(from, 1);
    steps.splice(to, 0, moved);
    setDraft({ ...draft, steps });
  };

  const save = async () => {
    setSaving(true);
    const next = fromDraft({ ...draft, value: isNew ? toKey(draft.label) : draft.value });
    const message = await onSave(next, protocol?.value ?? null);
    setSaving(false);
    setError(message);
    if (!message) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "New protocol" : draft.label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="protocol-label">Name</Label>
            <Input
              id="protocol-label"
              value={draft.label}
              placeholder="Tensile test campaign"
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="protocol-description">Description</Label>
            <Textarea
              id="protocol-description"
              rows={2}
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Sample types</Label>
            <p className="text-xs text-muted-foreground">None ticked: every sample type.</p>
            <CheckList
              items={sampleTypes.map((t) => ({ value: t.value, label: t.label }))}
              selected={draft.appliesToSampleTypes}
              onChange={(appliesToSampleTypes) => setDraft({ ...draft, appliesToSampleTypes })}
            />
          </div>

          <div className="space-y-3">
            <Label>Steps</Label>
            {draft.steps.map((s, i) => (
              <StepBlock
                key={i}
                index={i}
                count={draft.steps.length}
                step={s}
                techniques={techniques}
                quantities={quantities.map((q) => ({ value: q.value, label: q.label }))}
                equipment={equipment.map((e) => ({ value: e.value, label: e.label }))}
                onChange={(next) => setStep(i, next)}
                onMove={(to) => moveStep(i, to)}
                onRemove={() => setDraft({ ...draft, steps: draft.steps.filter((_, j) => j !== i) })}
              />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setDraft({ ...draft, steps: [...draft.steps, newStep()] })}>
              <Plus className="mr-1 size-4" /> Step
            </Button>
          </div>

          {error && <p className="whitespace-pre-line text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !draft.label.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
