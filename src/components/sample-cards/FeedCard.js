import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function FeedCard({ sample, handleStatusIncrementSample, setSample }) {
  // Guard clause for required props
  if (!sample || typeof handleStatusIncrementSample !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Feeding</CardTitle>
      </CardHeader>
      <CardContent>
        Feeding count: {sample.fed || 0}<br />
        Last fed on {sample.lastFed ? new Date(sample.lastFed).toLocaleDateString() : 'Never'}
      </CardContent>
      <CardFooter>
        <Button size="sm" variant="secondary" onClick={() => {
          handleStatusIncrementSample(sample._id, "fed");
          if (setSample) {
            setSample(prev => ({ ...prev, fed: (prev.fed || 0) + 1 }));
          }
        }}>
          Feed
        </Button>
      </CardFooter>
    </Card>
  );
}

// Card metadata for the registry system
FeedCard.displayName = 'FeedCard';
FeedCard.supportedTypes = ['*']; // Universal card
FeedCard.position = 'main';
FeedCard.dependencies = ['handleStatusIncrementSample', 'setSample'];
FeedCard.shouldRender = (sample) => sample?.lifestatus === "alive";
