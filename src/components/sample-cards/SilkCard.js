import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfigTypes } from '@/hooks/useConfigTypes';

export function SilkCard({ sample, handleChange }) {
  // Get silkcategories from the hook
  const { silkcategories } = useConfigTypes();
  
  // Guard clause for required props
  if (!sample || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Silk Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="silktype">Silk Type</Label>
            <Select value={sample?.silktype} onValueChange={(e) => handleChange("silktype", e)}>
              <SelectTrigger id="silktype" aria-label="Select silk type">
                <SelectValue placeholder="Select silk type" />
              </SelectTrigger>
              <SelectContent>
                {silkcategories
                  ?.sort((a, b) => a.label.localeCompare(b.label))
                  .map((category, index) => (
                    <SelectItem key={index} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="box">Box</Label>
            <Input
              id="box"
              value={sample.box || ""}
              onChange={(e) => handleChange("box", e.target.value)}
            />
          </div>
          
          <div className="grid gap-3">
            <Label htmlFor="slot">Slot</Label>
            <Input
              id="slot"
              value={sample.slot || ""}
              onChange={(e) => handleChange("slot", e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Card metadata for the registry system
SilkCard.displayName = 'SilkCard';
SilkCard.supportedTypes = ['silk'];
SilkCard.position = 'main';
SilkCard.shouldRender = (sample) => sample.type === 'silk';
