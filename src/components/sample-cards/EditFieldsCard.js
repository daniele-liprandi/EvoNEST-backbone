import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

export function EditFieldsCard({ sample, handleChange, usersData }) {
  // Guard clause for required props
  if (!sample || !usersData || !Array.isArray(usersData) || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Fields</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="family">Family</Label>
            <Input
              id="family"
              value={sample.family || ""}
              onChange={(e) => handleChange("family", e.target.value)}
            />
          </div>
          
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="genus">Genus</Label>
            <Input
              id="genus"
              value={sample.genus || ""}
              onChange={(e) => handleChange("genus", e.target.value)}
            />
          </div>
          
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="species">Species</Label>
            <Input
              id="species"
              value={sample.species || ""}
              onChange={(e) => handleChange("species", e.target.value)}
            />
          </div>
          
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="responsible">Responsible</Label>
            <Select 
              value={sample.responsible || ""} 
              onValueChange={(value) => handleChange("responsible", value)}
            >
              <SelectTrigger id="responsible" aria-label="Select responsible">
                <SelectValue placeholder="Select responsible" />
              </SelectTrigger>
              <SelectContent>
                {usersData
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((user, index) => (
                    <SelectItem key={index} value={user._id}>
                      {user.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Card metadata for the registry system
EditFieldsCard.displayName = 'EditFieldsCard';
EditFieldsCard.supportedTypes = ['*']; // Universal card
EditFieldsCard.position = 'main';
EditFieldsCard.dependencies = ['usersData'];
EditFieldsCard.shouldRender = (sample) => !!sample?.family;
