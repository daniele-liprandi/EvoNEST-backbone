import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function AnimalCard({ sample, handleChange, samplesData }) {
  // Guard clause for required props
  if (!sample || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }
  
  // Check if there are any silk samples associated with this sample
  const weHaveSilks = samplesData?.filter(s => s.parentId === sample._id && s.type === "silk").length > 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Animal Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="sex">Sex</Label>
            <Select value={sample?.sex} onValueChange={(e) => handleChange("sex", e)}>
              <SelectTrigger id="sex" aria-label="Select sex">
                <SelectValue placeholder="Select sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-3">
            <Label htmlFor="lifestatus">Life Status</Label>
            <Select value={sample?.lifestatus} onValueChange={(e) => handleChange("lifestatus", e)}>
              <SelectTrigger id="lifestatus" aria-label="Select status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alive">Alive</SelectItem>
                <SelectItem value="preserved">Preserved</SelectItem>
                <SelectItem value="nonpreserved">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-3">
            <Label htmlFor="lifestage">Life Stage</Label>
            <Select value={sample?.lifestage} onValueChange={(e) => handleChange("lifestage", e)}>
              <SelectTrigger id="lifestage" aria-label="Select lifestage">
                <SelectValue placeholder="Select lifestage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="egg">Egg</SelectItem>
                <SelectItem value="juvenile">Juvenile</SelectItem>
                <SelectItem value="sub-adult">Sub-adult</SelectItem>
                <SelectItem value="adult">Adult</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-3">
            <Button
              value={sample?.extractionfailed}
              disabled={weHaveSilks}
              variant={sample?.extractionfailed ? "destructive" : "secondary"}
              onClick={() => {
                if (sample?.extractionfailed) {
                  handleChange("extractionfailed", false)
                } else {
                  handleChange("extractionfailed", true)
                }
              }}
            >
              {
                // if disabled, show "extraction succeded". If now, show "extraction failed" if extraction failed, otherwise show "extraction unknown"
                weHaveSilks ? "Extraction succeeded" : sample?.extractionfailed ? "Extraction failed" : "Extraction unknown"
              }
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Card metadata for the registry system
AnimalCard.displayName = 'AnimalCard';
AnimalCard.supportedTypes = ['animal'];
AnimalCard.position = 'sidebar';
AnimalCard.dependencies = ['samplesData'];
AnimalCard.shouldRender = (sample) => sample.type === 'animal';
