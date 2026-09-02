"use client";

import { format } from "date-fns";
import { CalendarDays } from "lucide-react";
import type { Control } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CustomFieldDescriptor {
  key: string;
  label: string;
  kind: "text" | "number" | "date" | "select" | "textarea";
  options?: { value: string; label: string }[];
  description?: string;
}

/**
 * One admin-defined sample field, bound to react-hook-form under
 * `custom.<key>`. The built-in fields (taxonomy, location, parent...) are
 * rendered by the form itself; this only covers the plain kinds.
 */
export function CustomSampleField({
  control,
  field: def,
}: {
  control: Control<any>;
  field: CustomFieldDescriptor;
}) {
  return (
    <FormField
      control={control}
      name={`custom.${def.key}`}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{def.label}</FormLabel>
          <FormControl>
            {def.kind === "textarea" ? (
              <Textarea rows={3} {...field} value={field.value ?? ""} />
            ) : def.kind === "select" ? (
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${def.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {(def.options ?? []).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : def.kind === "date" ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    {field.value ? format(new Date(field.value), "PPP") : "Pick a date"}
                    <CalendarDays className="ml-auto size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(d) => field.onChange(d ? d.toISOString() : "")}
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <Input
                type={def.kind === "number" ? "number" : "text"}
                {...field}
                value={field.value ?? ""}
              />
            )}
          </FormControl>
          {def.description && <FormDescription>{def.description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
