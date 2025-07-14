import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Template for creating new sample cards
 * 
 * Copy this file and rename it to YourCardName.js
 * Update the component name, metadata, and implementation
 */

export function TemplateCard({ 
  sample, 
  handleChange, 
  setSample,
  samplesData,
  usersData,
  handleStatusIncrementSample 
}) {
  // 🔒 REQUIRED: Guard clause for essential props
  if (!sample || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }

  // 🔒 REQUIRED: Additional validation for optional props
  if (!usersData || !Array.isArray(usersData)) {
    // Handle missing optional props gracefully
    console.warn('TemplateCard: usersData not available');
  }

  // 📊 Your card logic here
  const handleFieldChange = (field, value) => {
    // Custom logic before calling handleChange
    // e.g., validation, transformation, etc.
    handleChange(field, value);
  };

  const handleButtonClick = () => {
    // Custom button logic
    if (handleStatusIncrementSample) {
      handleStatusIncrementSample(sample._id, "customField");
    }
    
    if (setSample) {
      setSample(prev => ({
        ...prev,
        customField: (prev.customField || 0) + 1,
        lastUpdated: new Date().toISOString()
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Card Title</CardTitle>
        {/* Optional: Add description */}
        {/* <CardDescription>Card description</CardDescription> */}
      </CardHeader>
      
      <CardContent>
        <div className="grid gap-6">
          {/* Example: Select dropdown */}
          <div className="grid gap-3">
            <Label htmlFor="customField">Custom Field</Label>
            <Select 
              value={sample?.customField || ""} 
              onValueChange={(value) => handleFieldChange("customField", value)}
            >
              <SelectTrigger id="customField" aria-label="Select custom field">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
                <SelectItem value="option3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Example: Text input */}
          <div className="grid gap-3">
            <Label htmlFor="textField">Text Field</Label>
            <Input
              id="textField"
              value={sample.textField || ""}
              onChange={(e) => handleFieldChange("textField", e.target.value)}
              placeholder="Enter text..."
            />
          </div>

          {/* Example: Textarea */}
          <div className="grid gap-3">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={sample.notes || ""}
              onChange={(e) => handleFieldChange("notes", e.target.value)}
              placeholder="Add notes..."
              className="min-h-[100px]"
            />
          </div>

          {/* Example: Conditional content */}
          {sample.customField === 'option1' && (
            <Alert>
              <AlertDescription>
                This appears when option1 is selected
              </AlertDescription>
            </Alert>
          )}

          {/* Example: Display computed data */}
          <div className="grid gap-3">
            <Label>Computed Information</Label>
            <div className="flex gap-2">
              <Badge variant="outline">
                Status: {sample.lifestatus || 'Unknown'}
              </Badge>
              <Badge variant="outline">
                Count: {sample.customField || 0}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Optional: Footer with actions */}
      <CardFooter className="flex justify-between">
        <Button 
          size="sm" 
          variant="secondary" 
          onClick={handleButtonClick}
        >
          Custom Action
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Last updated: {sample.lastUpdated ? 
            new Date(sample.lastUpdated).toLocaleDateString() : 
            'Never'
          }
        </div>
      </CardFooter>
    </Card>
  );
}

// 🔒 REQUIRED: Card metadata for the registry system
TemplateCard.displayName = 'TemplateCard';

// 🔒 REQUIRED: Which sample types this card supports
TemplateCard.supportedTypes = ['your-sample-type']; // e.g., ['plant', 'animal']

// 🔒 REQUIRED: Card positioning ('main', 'sidebar', or 'full')
TemplateCard.position = 'main';

// 🔒 OPTIONAL: Dependencies this card needs
TemplateCard.dependencies = ['setSample', 'handleStatusIncrementSample'];

// 🔒 OPTIONAL: Conditional rendering logic
TemplateCard.shouldRender = (sample) => {
  // Return true if card should be shown for this sample
  return sample.type === 'your-sample-type';
};

// 🔒 OPTIONAL: Priority for ordering cards (lower = higher priority)
TemplateCard.priority = 100;

/**
 * 📝 DEVELOPMENT CHECKLIST:
 * 
 * ✅ 1. Rename TemplateCard to YourCardName
 * ✅ 2. Update displayName to match component name
 * ✅ 3. Set supportedTypes array
 * ✅ 4. Choose position ('main' or 'sidebar')
 * ✅ 5. Implement your card logic
 * ✅ 6. Add proper prop validation
 * ✅ 7. Handle loading states with Skeleton
 * ✅ 8. Test with your sample type
 * ✅ 9. Add to registry.js imports
 * ✅ 10. Update SAMPLE_CARDS object in registry.js
 */

/**
 * 🚀 QUICK START:
 * 
 * 1. Copy this file: cp TemplateCard.js MyNewCard.js
 * 2. Replace "Template" with "MyNew" throughout
 * 3. Update supportedTypes: ['my-sample-type']
 * 4. Implement your card content
 * 5. Add import to registry.js
 * 6. Add to SAMPLE_CARDS object
 */
