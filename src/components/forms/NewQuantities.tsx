import Link from "next/link";
import type { ReactNode } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LabelType } from "@/utils/types";
import type {
  NewQuantity,
  QuantityChoice,
} from "@/utils/file-management/quantity-mapping";

const encode = (choice: QuantityChoice) =>
  choice.action === "map" ? `map:${choice.to}` : choice.action;
const decode = (raw: string): QuantityChoice =>
  raw.startsWith("map:")
    ? { action: "map", to: raw.slice(4) }
    : { action: raw as "add" | "skip" };

/** Add, map or skip each new quantity; written to config on submit. */
export function NewQuantities({
  newTypes,
  traitquantities,
  fileCount,
  canEdit,
  choices,
  onChange,
  heading,
  note,
  readOnlyNote,
}: {
  newTypes: NewQuantity[];
  traitquantities: LabelType[];
  fileCount?: number;
  /** Undefined while the user's capabilities are still loading. */
  canEdit: boolean | undefined;
  choices: Record<string, QuantityChoice>;
  onChange: (value: string, choice: QuantityChoice) => void;
  heading?: string;
  note?: ReactNode;
  readOnlyNote?: ReactNode;
}) {
  if (newTypes.length === 0) return null;

  const subject =
    (fileCount ?? 1) > 1
      ? "The uploaded measurements contain"
      : "The uploaded measurement contains";
  const count = `${newTypes.length} new ${newTypes.length > 1 ? "quantities" : "quantity"}`;

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">{heading ?? `${subject} ${count}`}</p>
      {canEdit === undefined ? null : canEdit ? (
        <>
          <ul className="space-y-2">
            {newTypes.map((type) => (
              <li
                key={type.value}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm">{type.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {type.value}
                    {type.unit ? ` · ${type.unit}` : ""}
                  </p>
                </div>
                <Select
                  value={encode(choices[type.value] ?? { action: "add" })}
                  onValueChange={(raw) => onChange(type.value, decode(raw))}
                >
                  <SelectTrigger
                    className="w-56"
                    aria-label={`What to do with ${type.label}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add as a new quantity</SelectItem>
                    <SelectItem value="skip">Skip</SelectItem>
                    {traitquantities.length > 0 && (
                      <>
                        <SelectSeparator />
                        <SelectGroup>
                          <SelectLabel>Store as</SelectLabel>
                          {traitquantities.map((t) => (
                            <SelectItem key={t.value} value={`map:${t.value}`}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
          {note ?? (
            <p className="text-xs text-muted-foreground">
              Saved to Settings, Quantities, when you submit. Skipped ones are
              stored under the parser&apos;s name.
            </p>
          )}
        </>
      ) : (
        (readOnlyNote ?? (
          <p className="text-sm text-muted-foreground">
            Someone with configuration rights can add them on the{" "}
            <Link href="/experiments/parsers" className="underline">
              Parsers page
            </Link>
            .
          </p>
        ))
      )}
    </div>
  );
}
