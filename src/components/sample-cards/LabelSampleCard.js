import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

export function LabelSampleCard({ sample, sampleId }) {
  const [labelSize, setLabelSize] = useState('300');
  const [includeGenus, setIncludeGenus] = useState(true);
  const [includeSpecies, setIncludeSpecies] = useState(true);
  const [includeName, setIncludeName] = useState(true);

  // Guard clause for required props
  if (!sample || !sampleId) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  const compressed_sample_id_base64url = typeof window !== 'undefined' 
    ? Buffer.from(sampleId, 'hex').toString('base64')
        .replace(/\+/g, '-')  // Convert + to -
        .replace(/\//g, '_')  // Convert / to _
        .replace(/=+$/, '')
    : '';
  
  const qrcodeurl = `/api/modifyImage?qrcodeurl=https://barcodeapi.org/api/qr/${compressed_sample_id_base64url}&labelwidth=${labelSize}&label1=${includeGenus ? sample.genus : ''}&label2=${includeSpecies ? sample.species : ''}&label3=${includeName ? sample.name : ''}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Label maker</CardTitle>
        <CardDescription>
          Label with unique QR for the sample
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="labelSize">Label width</Label>
            <Input
              type="number"
              id="labelSize"
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value)}
              placeholder="Enter label size"
            />
          </div>
          <div className="grid gap-3">
            <Label>Fields to Include</Label>
            <div className="flex items-center gap-2">
              <Checkbox checked={includeGenus} onCheckedChange={(e) => setIncludeGenus(e)} />
              <Label htmlFor="includeGenus">Genus</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={includeSpecies} onCheckedChange={(e) => setIncludeSpecies(e)} />
              <Label htmlFor="includeSpecies">Species</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={includeName} onCheckedChange={(e) => setIncludeName(e)} />
              <Label htmlFor="includeName">Name</Label>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <img src={qrcodeurl} alt="QR Code" className="w-full" />
      </CardFooter>
    </Card>
  );
}

// Card metadata for the registry system
LabelSampleCard.displayName = 'LabelSampleCard';
LabelSampleCard.supportedTypes = ['*']; // Universal card
LabelSampleCard.position = 'sidebar';
LabelSampleCard.dependencies = ['sampleId'];
