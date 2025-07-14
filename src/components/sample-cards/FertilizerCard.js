import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from "@/components/ui/switch";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export function FertilizerCard({ sample, handleChange }) {
  // Guard clause for required props
  if (!sample || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }

  // Extract NPK values for display
  const npkRatio = sample.npkRatio || "0-0-0";
  const [n, p, k] = npkRatio.split('-').map(val => parseInt(val, 10) || 0);

  const npkData = [
    { name: 'N', value: n },
    { name: 'P', value: p },
    { name: 'K', value: k }
  ];

  const COLORS = ['#4f46e5', '#0ea5e9', '#10b981'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fertilizer Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="npkRatio">NPK Ratio</Label>
            <Input
              id="npkRatio"
              value={sample.npkRatio || ""}
              onChange={(e) => handleChange("npkRatio", e.target.value)}
              placeholder="e.g. 5-3-7"
            />
          </div>

          <div className="grid gap-3">
            <Label htmlFor="phLevel">pH Level</Label>
            <Input
              id="phLevel"
              value={sample.phLevel || ""}
              onChange={(e) => handleChange("phLevel", e.target.value)}
            />
          </div>

          <div className="grid gap-3">
            <div className="flex items-center">
              <Label htmlFor="organicCertified" className="mr-2">Organic Certified</Label>
              <Switch
                id="organicCertified"
                checked={sample.organicCertified || false}
                onCheckedChange={(checked) => handleChange("organicCertified", checked)}
              />
            </div>
          </div>

          <div className="grid gap-3">
            <Label>NPK Composition</Label>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={npkData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {npkData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 100 }}
                    position={{ y: 0 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-md">
                            <p className="text-sm">{`${payload[0].name}: ${payload[0].value}`}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex w-full justify-between text-sm">
          <span>Storage: {sample.box || "N/A"} / {sample.slot || "N/A"}</span>
          <span>{sample.organicCertified ? "Organic Certified" : "Conventional"}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

// Card metadata for the registry system
FertilizerCard.displayName = 'FertilizerCard';
FertilizerCard.supportedTypes = ['fertilizer'];
FertilizerCard.position = 'main';
FertilizerCard.shouldRender = (sample) => sample.type === 'fertilizer';
