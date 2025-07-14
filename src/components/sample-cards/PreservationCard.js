import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

export function PreservationCard({ sample, handleChange }) {
  // Guard clause for required props
  if (!sample || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preservation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="preservation">Preservation method</Label>
            <Select value={sample?.preservation} onValueChange={(e) => handleChange("preservation", e)}>
              <SelectTrigger id="preservation" aria-label="Select preservation method">
                <SelectValue placeholder="Select preservation method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ethanol">Ethanol</SelectItem>
                <SelectItem value="formalin">Formalin</SelectItem>
                <SelectItem value="freezing">Freezing</SelectItem>
                <SelectItem value="drying">Drying</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-3">
            <Label htmlFor="preservationDate">Preservation date</Label>
            <Input 
              type="date"
              id="preservationDate"
              value={sample?.preservationDate}
              onChange={(e) => handleChange("preservationDate", e.target.value)} 
              placeholder="yyyy-mm-dd" 
            />
          </div>
          
          <div className="grid-cols-3 gap-3">
            <div className="w-5/6">
              <Label htmlFor="collection">Collection</Label>
              <Input
                id="collection"
                value={sample.collection || ""}
                onChange={(e) => handleChange("collection", e.target.value)}
              />
            </div>
            <div className="w-5/6">
              <Label htmlFor="box">Box</Label>
              <Input
                id="box"
                value={sample.box || ""}
                onChange={(e) => handleChange("box", e.target.value)}
              />
            </div>
            <div className="w-5/6">
              <Label htmlFor="slot">Slot</Label>
              <Input
                id="slot"
                value={sample.slot || ""}
                onChange={(e) => handleChange("slot", e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid gap-3">
            <Label htmlFor="preservationNotes">Preservation Notes</Label>
            <Textarea
              id="preservationNotes"
              value={sample?.preservationNotes || ""}
              onChange={(e) => handleChange("preservationNotes", e.target.value)}
              placeholder="Additional notes about preservation"
              className="min-h-[100px]"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Card metadata for the registry system
PreservationCard.displayName = 'PreservationCard';
PreservationCard.supportedTypes = ['*']; // Universal card
PreservationCard.position = 'main';
PreservationCard.shouldRender = (sample) => sample?.lifestatus === "preserved";
