"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SAMPLE_COLUMN_KEYS,
  CUSTOM_COLUMN_KINDS,
  defaultColumnsForType,
} from "@/app/(nest)/samples/columns";

export interface SampleTypeConfig {
  value: string;
  label: string;
  columns?: ColumnEntry[];
  [key: string]: unknown;
}

interface CustomColumn {
  key: string;
  label: string;
  kind: string;
  icon?: string;
  options?: { value: string; label: string }[];
  field?: string;
  days?: number;
}

type ColumnEntry = string | CustomColumn;

const isCustom = (entry: ColumnEntry): entry is CustomColumn =>
  typeof entry === "object" && entry !== null;

/** "recentChange" -> "Recent change" — matches the ad-hoc prettifying elsewhere on this page. */
function prettify(key: string): string {
  const spaced = key.replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** One option per line, "value" or "value: Label". */
function parseOptions(text: string): { value: string; label: string }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...rest] = line.split(":");
      const v = value.trim();
      return { value: v, label: rest.join(":").trim() || v };
    });
}

const emptyCustom = (): CustomColumn => ({ key: "", label: "", kind: "text" });

export function ColumnEditor({
  type,
  onSaved,
}: {
  type: SampleTypeConfig;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ColumnEntry[]>([]);
  const [draft, setDraft] = useState<CustomColumn>(emptyCustom);
  const [optionsText, setOptionsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed from the type's own list, or the fallback the table would use anyway.
  const reset = () => {
    setEntries(
      Array.isArray(type.columns) && type.columns.length
        ? type.columns
        : defaultColumnsForType(type.value),
    );
    setDraft(emptyCustom());
    setOptionsText("");
    setError(null);
  };

  const usedKeys = useMemo(
    () => new Set(entries.map((e) => (isCustom(e) ? e.key : e))),
    [entries],
  );
  const availableBuiltins = SAMPLE_COLUMN_KEYS.filter((k) => !usedKeys.has(k));

  const move = (index: number, delta: number) => {
    const next = [...entries];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setEntries(next);
  };

  const remove = (index: number) =>
    setEntries(entries.filter((_, i) => i !== index));

  const addBuiltin = (key: string) => setEntries([...entries, key]);

  const addCustom = () => {
    const key = draft.key.trim();
    const label = draft.label.trim();
    if (!key || !label) {
      setError("Custom columns need a field and a label.");
      return;
    }
    if (usedKeys.has(key)) {
      setError(`"${key}" is already in the list.`);
      return;
    }
    const col: CustomColumn = { key, label, kind: draft.kind };
    if (draft.kind === "counter" && draft.icon?.trim()) col.icon = draft.icon.trim();
    if (draft.kind === "toggle") col.options = parseOptions(optionsText);
    if (draft.kind === "progress") {
      if (draft.field?.trim()) col.field = draft.field.trim();
      if (draft.days) col.days = Number(draft.days);
    }
    setEntries([...entries, col]);
    setDraft(emptyCustom());
    setOptionsText("");
    setError(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/config/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "updateitem",
          type: "sampletypes",
          oldValue: type.value,
          item: { ...type, columns: entries },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not save the column layout.");
      }
      setOpen(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) reset();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Columns
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{type.label} table columns</DialogTitle>
          <DialogDescription>
            The columns shown when browsing {type.label.toLowerCase()} samples, in
            order. A selection column and the row actions are always added around
            these.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground">No columns yet.</p>
          )}
          {entries.map((entry, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md border px-3 py-2"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="Move up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={index === entries.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
              <span className="flex-1 text-sm">
                {isCustom(entry) ? entry.label : prettify(entry)}
              </span>
              {isCustom(entry) ? (
                <Badge variant="secondary">{entry.kind}</Badge>
              ) : (
                <Badge variant="outline">built-in</Badge>
              )}
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
                aria-label="Remove column"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Select value="" onValueChange={addBuiltin}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Add a built-in column…" />
            </SelectTrigger>
            <SelectContent>
              {availableBuiltins.length === 0 ? (
                <SelectItem value="__none" disabled>
                  All built-in columns are in use
                </SelectItem>
              ) : (
                availableBuiltins.map((key) => (
                  <SelectItem key={key} value={key}>
                    {prettify(key)}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 rounded-md border border-dashed p-3">
          <p className="text-sm font-medium">Add a custom column</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cc-key">Field name</Label>
              <Input
                id="cc-key"
                placeholder="growthStage"
                value={draft.key}
                onChange={(e) => setDraft({ ...draft, key: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cc-label">Column label</Label>
              <Input
                id="cc-label"
                placeholder="Growth stage"
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
                {CUSTOM_COLUMN_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {draft.kind === "counter" && (
            <div className="space-y-1">
              <Label htmlFor="cc-icon">Button symbol (optional)</Label>
              <Input
                id="cc-icon"
                placeholder="+"
                value={draft.icon ?? ""}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
              />
            </div>
          )}

          {draft.kind === "toggle" && (
            <div className="space-y-1">
              <Label htmlFor="cc-options">
                Options — one per line, <code>value: Label</code>
              </Label>
              <Textarea
                id="cc-options"
                rows={4}
                placeholder={"seedling: Seedling\nvegetative: Vegetative\nflowering: Flowering"}
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
              />
            </div>
          )}

          {draft.kind === "progress" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cc-field">Date field</Label>
                <Input
                  id="cc-field"
                  placeholder="lastWatered"
                  value={draft.field ?? ""}
                  onChange={(e) => setDraft({ ...draft, field: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cc-days">Window (days)</Label>
                <Input
                  id="cc-days"
                  type="number"
                  placeholder="7"
                  value={draft.days ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, days: Number(e.target.value) || undefined })
                  }
                />
              </div>
            </div>
          )}

          <Button type="button" variant="secondary" size="sm" onClick={addCustom}>
            <Plus size={14} /> Add column
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEntries(defaultColumnsForType(type.value))}
          >
            <Trash size={14} /> Reset to default
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
