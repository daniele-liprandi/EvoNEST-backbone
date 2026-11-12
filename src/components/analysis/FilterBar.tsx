import { Check, Plus, X } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DimensionOption } from "@/hooks/useAnalysis";
import { cn } from "@/lib/utils";

const summary = (values: string[]) =>
  values.length === 0 ? "any" : values.length <= 2 ? values.join(", ") : `${values.length} values`;

/** A dimension without selected values is not filtered. */
export function FilterBar({
  dimensions,
  filters,
  onChange,
}: {
  dimensions: DimensionOption[];
  filters: Record<string, string[]>;
  onChange: (filters: Record<string, string[]>) => void;
}) {
  const active = Object.keys(filters);
  const available = dimensions.filter((d) => !active.includes(d.id));

  const set = (dim: string, values: string[]) => onChange({ ...filters, [dim]: values });
  const remove = (dim: string) => {
    const next = { ...filters };
    delete next[dim];
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {active.map((id) => {
        const dim = dimensions.find((d) => d.id === id);
        if (!dim) return null;
        const selected = filters[id];
        return (
          <div key={id} className="flex items-center rounded-md border">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-r-none">
                  {dim.label}: <span className="ml-1 text-muted-foreground">{summary(selected)}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder={`Search ${dim.label.toLowerCase()}`} />
                  <CommandList>
                    <CommandEmpty>No values.</CommandEmpty>
                    <CommandGroup>
                      {dim.values.map((value) => {
                        const on = selected.includes(value);
                        return (
                          <CommandItem
                            key={value}
                            value={value}
                            onSelect={() => set(id, on ? selected.filter((v) => v !== value) : [...selected, value])}
                          >
                            <Check className={cn("mr-2 h-4 w-4", on ? "opacity-100" : "opacity-0")} />
                            {value}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-none px-2"
              aria-label={`Remove the ${dim.label} filter`}
              onClick={() => remove(id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
      {available.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Filter on" />
              <CommandList>
                <CommandEmpty>No dimensions.</CommandEmpty>
                <CommandGroup>
                  {available.map((d) => (
                    <CommandItem key={d.id} value={d.label} onSelect={() => set(d.id, [])}>
                      {d.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
