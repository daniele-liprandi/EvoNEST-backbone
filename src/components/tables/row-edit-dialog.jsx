"use client";

import { useState } from "react";
import { PencilSimple } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/**
 * Field-driven editor for the scalar fields of one or more rows. Only the
 * fields the user actually changes are handed to `onSubmit`, so an untouched
 * field is never written back.
 *
 * In bulk mode (`rows` has more than one entry) inputs start empty and a field
 * left untouched is not applied; a field the user sets is applied to every row.
 *
 * @param {{
 *   rows: Record<string, any>[],
 *   fields: { key: string, label: string, type?: "text"|"number"|"date"|"textarea"|"select", options?: {value:string,label:string}[] }[],
 *   entityLabel: string,
 *   onSubmit: (ids: string[], changes: Record<string, any>) => Promise<any> | any,
 *   trigger?: import("react").ReactNode,
 * }} props
 */
export function RowEditDialog({ rows, fields, entityLabel, onSubmit, trigger }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const bulk = rows.length > 1;
  const ids = rows.map((row) => row._id ?? row.id);

  // Single row: pre-fill from the row. Bulk: start blank so an untouched field
  // stays untouched.
  const initial = (field) => {
    if (bulk) return "";
    const raw = rows[0]?.[field.key];
    if (field.type === "date") return toDateInput(raw);
    return raw ?? "";
  };

  const current = (field) => (field.key in draft ? draft[field.key] : initial(field));

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const changes = {};
  for (const field of fields) {
    if (!(field.key in draft)) continue;
    const next = draft[field.key];
    if (next === "" || next === initial(field)) continue;
    changes[field.key] =
      field.type === "date" ? new Date(next).toISOString() : next;
  }
  const changedCount = Object.keys(changes).length;

  const reset = () => setDraft({});

  async function save() {
    setSaving(true);
    try {
      await onSubmit(ids, changes);
      setOpen(false);
      reset();
    } finally {
      setSaving(false);
    }
  }

  const title = bulk ? `Edit ${rows.length} ${entityLabel}s` : `Edit ${entityLabel}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" aria-label={`Edit ${entityLabel}`}>
            <PencilSimple className="size-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="top-[7vh] max-h-[86vh] translate-y-0 overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {bulk
              ? "A field you set is applied to every selected row. Fields you leave blank are untouched."
              : "Only the fields you change are saved."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {fields.map((field) => {
            const id = `row-edit-${field.key}`;
            const value = current(field);
            return (
              <div key={field.key} className="flex flex-col gap-1.5">
                <Label htmlFor={id}>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    id={id}
                    value={value}
                    onChange={(e) => setField(field.key, e.target.value)}
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={value ? String(value) : undefined}
                    onValueChange={(next) => setField(field.key, next)}
                  >
                    <SelectTrigger id={id}>
                      <SelectValue placeholder={bulk ? "Leave unchanged" : "Select"} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={id}
                    type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                    value={value}
                    onChange={(e) => setField(field.key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || changedCount === 0}>
            {changedCount === 0
              ? "No changes"
              : `Save ${changedCount} field${changedCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
