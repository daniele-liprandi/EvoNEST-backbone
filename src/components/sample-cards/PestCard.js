import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

export function PestCard({ sample, handleChange, handleStatusIncrementSample }) {
  // Guard clause for required props
  if (!sample || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }

  // Extract severity trend from logbook if available
  const severityData = sample.logbook
    ?.filter(entry => entry[1].toLowerCase().includes("infestation") || entry[1].toLowerCase().includes("observed"))
    .map(entry => {
      const date = new Date(entry[0]).toLocaleDateString();
      // Try to extract severity level from entry text
      const severityMatch = entry[1].match(/(low|moderate|high|severe)/i);
      const severityValue = severityMatch ?
        { "low": 1, "moderate": 2, "high": 3, "severe": 4 }[severityMatch[0].toLowerCase()] :
        null;

      return {
        date,
        value: severityValue || (sample.severity === "low" ? 1 :
          sample.severity === "moderate" ? 2 :
            sample.severity === "high" ? 3 :
              sample.severity === "severe" ? 4 : 2)
      };
    })
    .slice(-5) || []; // Last 5 observations

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pest Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="grid gap-3">
            <Label htmlFor="severity">Infestation Severity</Label>
            <Select value={sample?.severity} onValueChange={(e) => {
              // Create a custom logbook entry with the new severity value
              const customLogbookEntry = `Observed ${e} infestation levels`;

              // Call handleChange with the new severity value and custom logbook entry
              handleChange("severity", e, customLogbookEntry, true);
            }}>
              <SelectTrigger id="severity" aria-label="Select severity level">
                <SelectValue placeholder="Select severity level" />
              </SelectTrigger>
              <SelectContent>
                {["low", "moderate", "high", "severe"].map((level) => (
                  <SelectItem key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="lifecycleStage">Lifecycle Stage</Label>
            <Select value={sample?.lifecycleStage} onValueChange={(e) => handleChange("lifecycleStage", e)}>
              <SelectTrigger id="lifecycleStage" aria-label="Select lifecycle stage">
                <SelectValue placeholder="Select lifecycle stage" />
              </SelectTrigger>
              <SelectContent>
                {["egg", "larva", "nymph", "pupa", "adult"].map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <Label htmlFor="controlMethod">Control Method</Label>
            <Select value={sample?.controlMethod} onValueChange={(e) => handleChange("controlMethod", e)}>
              <SelectTrigger id="controlMethod" aria-label="Select control method">
                <SelectValue placeholder="Select control method" />
              </SelectTrigger>
              <SelectContent>
                {["biological", "organic spray", "predatory insects", "traps", "none", "mechanical"].map((method) => (
                  <SelectItem key={method} value={method}>
                    {method.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {severityData.length > 0 && (
            <div className="grid gap-3">
              <Label>Severity Trend</Label>
              <div className="h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={severityData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 4]} ticks={[1, 2, 3, 4]} tickFormatter={(tick) =>
                      ["", "Low", "Moderate", "High", "Severe"][tick]}
                      width={80}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Card metadata for the registry system
PestCard.displayName = 'PestCard';
PestCard.supportedTypes = ['pest'];
PestCard.position = 'main';
PestCard.dependencies = ['handleStatusIncrementSample'];
PestCard.shouldRender = (sample) => sample.type === 'pest';
