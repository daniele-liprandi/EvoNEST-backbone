# Component Development Guide

## Modular sample card system

The sample detail page (`src/app/(nest)/sample/[id]/page.js`) uses a modular card system that allows developers to add new card components without modifying the main page file. Both universal cards and type specific cards can be developed. This guide shows you exactly how to create and integrate new cards.

### Quick start

1. **Copy the template**: `src/components/sample-cards/TemplateCard.js`
2. **Rename and customize** your card
3. **Register in** `src/components/sample-cards/registry.js`
4. **Done!** Your card automatically appears

### Detailed guide

#### 1. Card component structure

All sample cards follow this pattern:

```javascript
export function MyCard({ sample, handleChange, setSample }) {
  // Guard clause (required)
  if (!sample || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Your card content */}
      </CardContent>
    </Card>
  );
}

// Metadata (required)
MyCard.displayName = 'MyCard';
MyCard.supportedTypes = ['plant', 'animal'];
MyCard.position = 'main'; // or 'sidebar'
```

#### 2. Creating a new card

**Step 1:** Copy the template
```bash
cp src/components/sample-cards/TemplateCard.js src/components/sample-cards/MyNewCard.js
```

**Step 2:** Update the component
```javascript
// In MyNewCard.js
export function MyNewCard({ sample, handleChange }) {
  if (!sample || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Feature</CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="myField">My Field</Label>
        <Input
          id="myField"
          value={sample.myField || ""}
          onChange={(e) => handleChange("myField", e.target.value)}
        />
      </CardContent>
    </Card>
  );
}

MyNewCard.displayName = 'MyNewCard';
MyNewCard.supportedTypes = ['my-sample-type'];
MyNewCard.position = 'main';
```

**Step 3:** Register your card
```javascript
// In src/components/sample-cards/registry.js
import { MyNewCard } from './MyNewCard';

export const SAMPLE_CARDS = {
  // ...existing cards...
  'my-sample-type': [MyNewCard],
};
```

That's it! Your card will automatically appear for samples of type `my-sample-type`.

### Card features

#### Props available to cards

- `sample` - Current sample data (required)
- `handleChange` - Function to update sample fields (required)  
- `setSample` - Update sample state locally
- `samplesData` - All samples (for relationships)
- `usersData` - All users (for dropdowns)
- `handleStatusIncrementSample` - Increment counters

#### Card positioning

```javascript
MyCard.position = 'main';    // Left column (main content)
MyCard.position = 'sidebar'; // Right column
MyCard.position = 'full';    // Full width
```

#### Conditional rendering

```javascript
MyCard.shouldRender = (sample) => {
  return sample.lifestatus === 'alive' && sample.type === 'animal';
};
```

#### Card dependencies

```javascript
MyCard.dependencies = ['usersData', 'handleStatusIncrementSample'];
```

### Examples

#### Simple input card
```javascript
export function SimpleCard({ sample, handleChange }) {
  if (!sample || typeof handleChange !== 'function') {
    return <Skeleton className="h-[200px] w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simple Field</CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="simpleField">Field Name</Label>
        <Input
          id="simpleField"
          value={sample.simpleField || ""}
          onChange={(e) => handleChange("simpleField", e.target.value)}
        />
      </CardContent>
    </Card>
  );
}

SimpleCard.displayName = 'SimpleCard';
SimpleCard.supportedTypes = ['any-type'];
SimpleCard.position = 'main';
```

#### Action card with button
```javascript
export function ActionCard({ sample, handleStatusIncrementSample, setSample }) {
  if (!sample) return <Skeleton className="h-[200px] w-full" />;

  const handleAction = () => {
    if (handleStatusIncrementSample) {
      handleStatusIncrementSample(sample._id, "actionCount");
    }
    if (setSample) {
      setSample(prev => ({
        ...prev,
        actionCount: (prev.actionCount || 0) + 1
      }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Action count: {sample.actionCount || 0}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleAction}>Perform Action</Button>
      </CardFooter>
    </Card>
  );
}

ActionCard.displayName = 'ActionCard';
ActionCard.supportedTypes = ['animal'];
ActionCard.position = 'sidebar';
ActionCard.dependencies = ['handleStatusIncrementSample', 'setSample'];
```

### File structure

```
src/components/sample-cards/
├── registry.js           # Card registration
├── cardBase.js          # Utilities and interfaces
├── TemplateCard.js      # Copy this for new cards
├── PlantCard.js         # Example extracted card
├── SoilCard.js
├── AnimalCard.js
└── YourNewCard.js       # Your custom cards
```

### Best practices

1. **Always include guard clauses** for prop validation
2. **Use Skeleton** for loading states
3. **Follow naming conventions** (PascalCase + 'Card' suffix)
4. **Test with different sample types**
5. **Handle missing data gracefully**
6. **Use semantic HTML** and proper labels

### Migration from existing code

To convert existing inline cards to the modular system:

1. **Extract** the card JSX into a separate component file
2. **Add metadata** (displayName, supportedTypes, position)
3. **Add to registry**
4. **Remove** from main page file

The system handles the rest automatically!
