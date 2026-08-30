"use client";

import { useState } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/**
 * Single-select toggle bound to one field of a table row. The status handlers
 * are debounced and do not refetch, so the cell keeps an optimistic local value
 * for immediate feedback; it snaps back to the server value whenever that
 * changes — tracked in render, not in an effect.
 *
 * @param {{
 *   value: string | undefined,
 *   options: { value: string, label: string, icon?: import("react").ReactNode }[],
 *   onChange: (value: string) => void,
 *   size?: "sm" | "lg",
 * }} props
 */
export function ToggleField({ value: serverValue, options, onChange, size = "sm" }) {
  const [optimistic, setOptimistic] = useState(serverValue);
  const [lastServerValue, setLastServerValue] = useState(serverValue);

  if (serverValue !== lastServerValue) {
    setLastServerValue(serverValue);
    setOptimistic(serverValue);
  }

  const select = (next) => {
    if (!next) return; // ignore the deselect that a second click on the active item emits
    setOptimistic(next);
    onChange(next);
  };

  return (
    <TooltipProvider>
      <ToggleGroup type="single" value={optimistic ?? ""} onValueChange={select} size={size}>
        {options.map((option) => (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>
              <ToggleGroupItem value={option.value} aria-label={option.label}>
                {option.icon ?? option.label}
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent>{option.label}</TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </TooltipProvider>
  );
}
