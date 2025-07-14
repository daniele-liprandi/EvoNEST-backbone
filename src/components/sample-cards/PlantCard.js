import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from "@/components/ui/switch";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

export function PlantCard({ sample, handleChange, handleStatusIncrementSample, setSample }) {
  // Guard clause for required props
  if (!sample || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }

  const wateringData = sample.logbook
    ?.filter(entry => entry[1].toLowerCase().includes("water"))
    .reduce((acc, entry) => {
      const date = new Date(entry[0]).toLocaleDateString();
      if (acc.some(item => item.date === date)) {
        return acc.map(item => item.date === date ? { ...item, value: item.value + 1 } : item);
      }
      return [...acc, { date, value: 1 }];
    }, [])
    .slice(-7) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plant Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="growthStage">Growth Stage</Label>
            <Select value={sample?.growthStage} onValueChange={(e) => handleChange("growthStage", e)}>
              <SelectTrigger id="growthStage" aria-label="Select growth stage">
                <SelectValue placeholder="Select growth stage" />
              </SelectTrigger>
              <SelectContent>
                {["seedling", "vegetative", "flowering", "fruiting", "mature", "dormant", "germination"].map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="fertilizer">Applied Fertilizer</Label>
            <Input
              id="fertilizer"
              value={sample.fertilizer || ""}
              onChange={(e) => handleChange("fertilizer", e.target.value)}
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="watering">Watering</Label>
              <span className="text-sm text-muted-foreground">
                Count: {sample.watered || 0}
              </span>
            </div>
            <div className="h-24">
              {wateringData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={wateringData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-md">
                              <p className="text-xs">{`Watered ${payload[0].value} times on: ${payload[0].payload.date}`}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No watering data available
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="secondary" onClick={() => {
          if (handleStatusIncrementSample) {
            handleStatusIncrementSample(sample._id, "watered");
          }
          if (setSample) {
            setSample(prev => ({
              ...prev,
              watered: (prev.watered || 0) + 1,
              lastWatered: new Date().toISOString(),
              logbook: [...(prev.logbook || []), [new Date().toISOString(), "Plant watered by user"]]
            }));
          }
        }}>
          Water Plant
        </Button>
        <div className="ml-auto text-sm text-muted-foreground">
          {sample.lastWatered ?
            `Last watered: ${new Date(sample.lastWatered).toLocaleDateString()}` :
            "Not watered yet"}
        </div>
      </CardFooter>
    </Card>
  );
}

// Card metadata for the registry system
PlantCard.displayName = 'PlantCard';
PlantCard.supportedTypes = ['plant'];
PlantCard.position = 'main';
PlantCard.dependencies = ['handleStatusIncrementSample', 'setSample'];
PlantCard.shouldRender = (sample) => sample.type === 'plant';
