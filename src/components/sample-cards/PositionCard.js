import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function PositionCard({ sample, handleChange }) {
  // Guard clause for required props
  if (!sample || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }

  const geourl = `https://www.openstreetmap.org/?mlat=${sample.lat}&mlon=${sample.lon}&zoom=12`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Position</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={sample.location || ""}
              onChange={(e) => {
                console.log("Location change");
                handleChange("location", e.target.value)
              }}
            />
          </div>
          
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              value={sample.lat || ""}
              onChange={(e) => handleChange("lat", e.target.value)}
            />
          </div>
          
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              value={sample.lon || ""}
              onChange={(e) => handleChange("lon", e.target.value)}
            />
          </div>
          
          <a href={geourl} target="_blank" rel="noreferrer">
            <Button size="sm" variant="secondary">
              Open in OSM
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// Card metadata for the registry system
PositionCard.displayName = 'PositionCard';
PositionCard.supportedTypes = ['*']; // Universal card
PositionCard.position = 'sidebar';
