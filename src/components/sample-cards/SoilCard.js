import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function SoilCard({ sample, handleChange }) {
  // Guard clause for required props
  if (!sample || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }

  // Extract soil analysis data from logbook if available
  const soilAnalysisData = sample.logbook
    ?.filter(entry => entry[1].toLowerCase().includes("analysis") || entry[1].toLowerCase().includes("testing"))
    .map(entry => ({
      date: new Date(entry[0]).toLocaleDateString(),
      event: entry[1]
    }))
    .slice(-5) || []; // Last 5 analysis events

  return (
    <Card>
      <CardHeader>
        <CardTitle>Soil Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="soilType">Soil Type</Label>
            <Select value={sample?.soilType} onValueChange={(e) => handleChange("soilType", e)}>
              <SelectTrigger id="soilType" aria-label="Select soil type">
                <SelectValue placeholder="Select soil type" />
              </SelectTrigger>
              <SelectContent>
                {["loam", "sandy loam", "clay loam", "silt loam", "clay", "sandy clay", "silty clay", "peat", "potting mix"].map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="location">Storage Location</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="box" className="text-xs">Box</Label>
                <Input
                  id="box"
                  value={sample.box || ""}
                  onChange={(e) => handleChange("box", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="slot" className="text-xs">Slot</Label>
                <Input
                  id="slot"
                  value={sample.slot || ""}
                  onChange={(e) => handleChange("slot", e.target.value)}
                />
              </div>
            </div>
          </div>

          {soilAnalysisData.length > 0 && (
            <div className="grid gap-3">
              <Label>Recent Analysis History</Label>
              <ul className="max-h-24 space-y-1 overflow-auto text-sm">
                {soilAnalysisData.map((item, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{item.date}</span>
                    <span className="truncate max-w-[200px]">{item.event.split(' by ')[0]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="outline" onClick={() => {
          // This would typically open a dialog to add soil analysis results
          // For now, just add a logbook entry
          const newEntry = [new Date().toISOString(), "Soil analysis requested by user"];
          handleChange("logbook", [...(sample.logbook || []), newEntry]);
        }}>
          Record Analysis
        </Button>
      </CardFooter>
    </Card>
  );
}

// Card metadata for the registry system
SoilCard.displayName = 'SoilCard';
SoilCard.supportedTypes = ['soil'];
SoilCard.position = 'main';
SoilCard.shouldRender = (sample) => sample.type === 'soil';
