"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
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

export interface SampleTypeConfig {
  value: string;
  label: string;
  columns?: unknown[];
  fields?: unknown[];
  [key: string]: unknown;
}

export type ListEntry = string | Record<string, any>;

const isCustom = (entry: ListEntry): entry is Record<string, any> =>
  typeof entry === "object" && entry !== null;

/**
 * Editor for one ordered per-type list stored on a sample type config — the
 * table `columns` or the create-form `fields`. The list is a mix of built-in
 * keys (strings) and custom objects; a specific editor supplies the palette,
 * the custom-entry draft form and how to turn that draft into an entry.
 */
export function ListEditor<Draft extends { key: string }>({
  type,
  onSaved,
  configField,
  triggerLabel,
  title,
  description,
  paletteKeys,
  prettify,
  emptyDraft,
  defaultEntries,
  renderDraft,
  buildEntry,
  entryKind,
  addPlaceholder = "Add a built-in…",
  customTitle,
  builtinBadge = () => "built-in",
}: {
  type: SampleTypeConfig;
  onSaved: () => void;
  configField: "columns" | "fields";
  triggerLabel: string;
  title: string;
  description: React.ReactNode;
  paletteKeys: string[];
  prettify: (key: string) => string;
  emptyDraft: () => Draft;
  defaultEntries: (typeValue: string) => ListEntry[];
  renderDraft: (draft: Draft, setDraft: (d: Draft) => void) => React.ReactNode;
  buildEntry: (draft: Draft) => { entry?: Record<string, any>; error?: string };
  entryKind: (entry: Record<string, any>) => string;
  addPlaceholder?: string;
  customTitle?: string;
  builtinBadge?: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ListEntry[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = () =>
    Array.isArray(type[configField]) && (type[configField] as unknown[]).length
      ? (type[configField] as ListEntry[])
      : defaultEntries(type.value);

  const reset = () => {
    setEntries(current());
    setDraft(emptyDraft());
    setError(null);
  };

  const usedKeys = useMemo(
    () => new Set(entries.map((e) => (isCustom(e) ? e.key : e))),
    [entries],
  );
  const availableBuiltins = paletteKeys.filter((k) => !usedKeys.has(k));

  const move = (index: number, delta: number) => {
    const next = [...entries];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setEntries(next);
  };

  const remove = (index: number) =>
    setEntries(entries.filter((_, i) => i !== index));

  const addCustom = () => {
    const { entry, error: buildError } = buildEntry(draft);
    if (buildError || !entry) {
      setError(buildError || "The custom entry is incomplete.");
      return;
    }
    if (usedKeys.has(entry.key)) {
      setError(`"${entry.key}" is already in the list.`);
      return;
    }
    setEntries([...entries, entry]);
    setDraft(emptyDraft());
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
          item: { ...type, [configField]: entries },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not save the change.");
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
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing here yet.</p>
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
                <Badge variant="secondary">{entryKind(entry)}</Badge>
              ) : (
                <Badge variant="outline">{builtinBadge(entry)}</Badge>
              )}
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove(index)}
                aria-label="Remove"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Select value="" onValueChange={(key) => setEntries([...entries, key])}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={addPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {availableBuiltins.length === 0 ? (
                <SelectItem value="__none" disabled>
                  All built-ins are in use
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
          <p className="text-sm font-medium">
            {customTitle ?? `Add a custom ${triggerLabel.toLowerCase().replace(/s$/, "")}`}
          </p>
          {renderDraft(draft, setDraft)}
          <Button type="button" variant="secondary" size="sm" onClick={addCustom}>
            <Plus size={14} /> Add
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEntries(defaultEntries(type.value))}
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

/** "recentChange" -> "Recent change". Shared prettifier for built-in keys. */
export function prettifyKey(key: string): string {
  const spaced = key.replace(/([A-Z])/g, " $1").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** One option per line, "value" or "value: Label". */
export function parseOptions(text: string): { value: string; label: string }[] {
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
