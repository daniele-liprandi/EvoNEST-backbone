import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DimensionOption } from "@/hooks/useAnalysis";

const NONE = "__none__";

export function DimensionSelect({
  id,
  label,
  dimensions,
  value,
  onChange,
  noneLabel,
  exclude = [],
}: {
  id: string;
  label: string;
  dimensions: DimensionOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  noneLabel?: string;
  exclude?: string[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
          {dimensions
            .filter((d) => d.id === value || !exclude.includes(d.id))
            .map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
