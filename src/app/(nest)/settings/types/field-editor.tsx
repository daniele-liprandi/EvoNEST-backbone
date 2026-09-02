"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SAMPLE_FIELD_KEYS,
  CUSTOM_FIELD_KINDS,
  defaultFieldsForType,
  fieldLabel,
} from "@/app/(nest)/samples/fields";
import {
  ListEditor,
  parseOptions,
  type SampleTypeConfig,
} from "./list-editor";

interface FieldDraft {
  key: string;
  label: string;
  kind: string;
  optionsText: string;
  description: string;
}

const emptyDraft = (): FieldDraft => ({
  key: "",
  label: "",
  kind: "text",
  optionsText: "",
  description: "",
});

function buildEntry(draft: FieldDraft): {
  entry?: Record<string, any>;
  error?: string;
} {
  const key = draft.key.trim();
  const label = draft.label.trim();
  if (!key || !label) return { error: "Custom fields need a name and a label." };
  const f: Record<string, any> = { key, label, kind: draft.kind };
  if (draft.kind === "select") {
    const options = parseOptions(draft.optionsText);
    if (options.length === 0) {
      return { error: "A select field needs at least one option." };
    }
    f.options = options;
  }
  if (draft.description.trim()) f.description = draft.description.trim();
  return { entry: f };
}

export function FieldEditor({
  type,
  onSaved,
}: {
  type: SampleTypeConfig;
  onSaved: () => void;
}) {
  return (
    <ListEditor<FieldDraft>
      type={type}
      onSaved={onSaved}
      configField="fields"
      triggerLabel="Fields"
      title={`${type.label} create form`}
      description={`The inputs shown when creating a ${type.label.toLowerCase()} sample, in order. The type picker, the name and the notes box are always shown.`}
      paletteKeys={SAMPLE_FIELD_KEYS}
      prettify={fieldLabel}
      emptyDraft={emptyDraft}
      defaultEntries={defaultFieldsForType}
      entryKind={(e) => e.kind}
      buildEntry={buildEntry}
      renderDraft={(draft, setDraft) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cf-key">Field name</Label>
              <Input
                id="cf-key"
                placeholder="plot"
                value={draft.key}
                onChange={(e) => setDraft({ ...draft, key: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cf-label">Label</Label>
              <Input
                id="cf-label"
                placeholder="Plot"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Kind</Label>
            <Select
              value={draft.kind}
              onValueChange={(kind) => setDraft({ ...draft, kind })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CUSTOM_FIELD_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {draft.kind === "select" && (
            <div className="space-y-1">
              <Label htmlFor="cf-options">
                Options — one per line, <code>value: Label</code>
              </Label>
              <Textarea
                id="cf-options"
                rows={4}
                placeholder={"seedling: Seedling\nvegetative: Vegetative"}
                value={draft.optionsText}
                onChange={(e) =>
                  setDraft({ ...draft, optionsText: e.target.value })
                }
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="cf-description">Help text (optional)</Label>
            <Input
              id="cf-description"
              placeholder="Shown under the input"
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </div>
        </>
      )}
    />
  );
}
