"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SAMPLE_COLUMN_KEYS,
  COLUMN_WIDGET_KINDS,
  defaultColumnsForType,
} from "@/app/(nest)/samples/columns";
import { customFieldMap } from "@/app/(nest)/samples/fields";
import {
  ListEditor,
  prettifyKey,
  type SampleTypeConfig,
} from "./list-editor";

interface WidgetDraft {
  key: string;
  label: string;
  kind: string;
  icon: string;
  field: string;
  days: string;
}

const emptyDraft = (): WidgetDraft => ({
  key: "",
  label: "",
  kind: "counter",
  icon: "",
  field: "",
  days: "",
});

function buildEntry(draft: WidgetDraft): {
  entry?: Record<string, any>;
  error?: string;
} {
  const key = draft.key.trim();
  const label = draft.label.trim();
  if (!key || !label) return { error: "A widget needs a field and a label." };
  const col: Record<string, any> = { key, label, kind: draft.kind };
  if (draft.kind === "counter" && draft.icon.trim()) col.icon = draft.icon.trim();
  if (draft.kind === "progress") {
    if (draft.field.trim()) col.field = draft.field.trim();
    if (draft.days) col.days = Number(draft.days);
  }
  return { entry: col };
}

export function ColumnEditor({
  type,
  onSaved,
}: {
  type: SampleTypeConfig;
  onSaved: () => void;
}) {
  // A column names a built-in column or one of this type's own fields; a custom
  // entry is only a counter or progress widget. Data fields are defined in the
  // Fields editor, not here.
  const fields = customFieldMap(type as Record<string, unknown>) as Record<
    string,
    { label?: string }
  >;
  const label = (key: string) => fields[key]?.label ?? prettifyKey(key);

  return (
    <ListEditor<WidgetDraft>
      type={type}
      onSaved={onSaved}
      configField="columns"
      triggerLabel="Columns"
      title={`${type.label} table columns`}
      description={`The columns shown when browsing ${type.label.toLowerCase()} samples, in order. A selection column and the row actions are always added around these.`}
      paletteKeys={[...SAMPLE_COLUMN_KEYS, ...Object.keys(fields)]}
      prettify={label}
      builtinBadge={(key) => (fields[key] ? "field" : "built-in")}
      addPlaceholder="Add a column…"
      customTitle="Add a counter or progress widget"
      emptyDraft={emptyDraft}
      defaultEntries={defaultColumnsForType}
      entryKind={(e) => e.kind}
      buildEntry={buildEntry}
      renderDraft={(draft, setDraft) => (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cw-key">Field name</Label>
              <Input
                id="cw-key"
                placeholder="watered"
                value={draft.key}
                onChange={(e) => setDraft({ ...draft, key: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cw-label">Column label</Label>
              <Input
                id="cw-label"
                placeholder="Watered"
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
                {COLUMN_WIDGET_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {draft.kind === "counter" && (
            <div className="space-y-1">
              <Label htmlFor="cw-icon">Button symbol (optional)</Label>
              <Input
                id="cw-icon"
                placeholder="+"
                value={draft.icon}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
              />
            </div>
          )}

          {draft.kind === "progress" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cw-field">Date field</Label>
                <Input
                  id="cw-field"
                  placeholder="sownDate"
                  value={draft.field}
                  onChange={(e) => setDraft({ ...draft, field: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cw-days">Window (days)</Label>
                <Input
                  id="cw-days"
                  type="number"
                  placeholder="120"
                  value={draft.days}
                  onChange={(e) => setDraft({ ...draft, days: e.target.value })}
                />
              </div>
            </div>
          )}
        </>
      )}
    />
  );
}
