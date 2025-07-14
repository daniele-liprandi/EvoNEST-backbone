import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export function HierarchyCard({ sample, samplesData, onParentChange }) {
  // Guard clause for required props
  if (!sample || !samplesData || typeof onParentChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Hierarchy</CardTitle>
      </CardHeader>
      <CardContent>
        {sample.parentId && (
          <Alert>
            <AlertTitle><h4>Parent</h4></AlertTitle>
            <AlertDescription>
              <Select value={sample.parentId} onValueChange={onParentChange}>
                <SelectTrigger id="parent" aria-label="Select parent">
                  <SelectValue placeholder="Select parent" />
                </SelectTrigger>
                <SelectContent>
                  {samplesData
                    .filter(s => s._id !== sample._id)
                    .map((parent, index) => (
                      <SelectItem key={index} value={parent._id}>
                        {parent.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button variant="link">
                <Link href={`/sample/${sample.parentId}`}>Go to</Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {!sample.parentId && (
          <Alert>
            <AlertTitle><h4>Parent</h4></AlertTitle>
            <AlertDescription>
              <Select defaultValue="No parent" onValueChange={onParentChange}>
                <SelectTrigger id="parent" aria-label="Select parent">
                  <SelectValue placeholder="Select parent" />
                </SelectTrigger>
                <SelectContent>
                  {samplesData
                    .filter(s => s._id !== sample._id)
                    .map((parent, index) => (
                      <SelectItem key={index} value={parent._id}>
                        {parent.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </AlertDescription>
          </Alert>
        )}
        
        <Alert>
          <AlertTitle><h4>Children</h4></AlertTitle>
          <AlertDescription>
            {samplesData.filter(s => s.parentId === sample._id).map((child, index) => (
              <Link href={`/sample/${child._id}`} key={index}>
                <div>
                  <p>{child.name}</p>
                </div>
              </Link>
            ))}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Card metadata for the registry system
HierarchyCard.displayName = 'HierarchyCard';
HierarchyCard.supportedTypes = ['*']; // Universal card
HierarchyCard.position = 'sidebar';
HierarchyCard.dependencies = ['samplesData', 'onParentChange'];
