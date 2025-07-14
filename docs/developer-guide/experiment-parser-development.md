# Experiment Parser Development Guide

Learn how to create custom experiment parsers that automatically generate traits from experimental data.

## Overview

The EvoNEST experiment parser system allows developers to create modular parsers that process experimental data and automatically generate traits.

## Quick Start

1. **Copy the template**: `src/utils/experiment-parsers/TemplateExperimentParser.js`
2. **Customize** your parser logic
3. **Register** in `src/utils/experiment-parsers/registry.js`
4. **Test** with your experiment type

## How It Works

The complete workflow from user action to trait generation:

1. **User uploads JSON file** with experiment data
2. **Frontend validates** data against parser's `requiredFields`
3. **Experiment is created** via POST to `/api/experiments`
4. **API automatically detects** parser support for the experiment type
5. **Parser processes** the data and generates traits
6. **Traits are created** and linked to the experiment
7. **User sees success message** confirming trait generation

When an experiment is submitted through the API:

1. The system checks if a parser exists for the experiment type
2. If found, the parser processes the raw data and generates traits
3. Traits are automatically created and linked to the experiment
4. The experiment is updated with calculated values

## Creating a Custom Parser

To create a new parser, first copy one of the existing parsers or templates found in `src/utils/experiment-parsers/`. The base class `BaseExperimentParser` provides essential methods for data extraction, trait creation, and experiment updates, and every parser should extend this class.

### Register Your Parser

```javascript
// In src/utils/experiment-parsers/registry.js
import { SpectroscopyParser } from './SpectroscopyParser';

export const EXPERIMENT_PARSERS = {
    // ...existing parsers...
    'raman': SpectroscopyParser,
};
```

**Important**: The registry maps experiment types to parser classes. Users will see the parser's `label` in the UI, but the system uses the registry key to find the correct parser.

## Frontend Integration

Your parser automatically appears in the EvoNEST experiment form once registered:

### Experiment Type Dropdown

- Parser's `label` appears as an option (e.g., "My Experiment")
- Selecting it shows "✓ This experiment type has automatic trait generation"


### API Discovery

Your parser metadata is automatically available via `/api/experiment-parsers`:

```javascript
// GET /api/experiment-parsers returns:
{
  "success": true,
  "parsers": [
    {
      "type": "spectroscopy",
      "label": "Spectroscopy Analysis",
      "description": "Processes spectroscopy data...",
      "supportedTypes": ["raman"],
      "requiredFields": ["Wavelength", "Intensity"],
      "generatedTraits": [
        { "name": "peakWavelength", "unit": "nm", "description": "..." }
      ],
      "version": "1.0.0",
      "hasSupport": true
    }
  ]
}
```

## JSON File Format

When users upload experiment data files, they should follow this structure:

```json
{
  "includedData": {
    "YourRequiredField1": [1, 2, 3, 4, 5],
    "YourRequiredField2": [10, 20, 30, 40, 50],
    "OptionalField": [100, 200, 300, 400, 500]
  },
  "metadata": [
    { "key": "SpecimenName", "value": "Sample_001" },
    { "key": "Equipment", "value": "MyInstrument" },
    { "key": "Date", "value": "2024-01-01" }
  ]
}
```

The `includedData` object contains the raw measurements your parser will process. The `metadata` array can contain additional information about the experiment.

## Available Methods from BaseExperimentParser

### Data Extraction Utilities

```javascript
// Extract numeric values from arrays
const maxValue = this.extractValue(dataArray, 'max');
const minValue = this.extractValue(dataArray, 'min');
const avgValue = this.extractValue(dataArray, 'avg');
const sumValue = this.extractValue(dataArray, 'sum');

// Check for required fields
const fieldCheck = this.checkRequiredFields(fileData.includedData, ['Wavelength', 'Intensity']);
if (!fieldCheck.success) {
    // Handle missing fields
}
```

### Trait Creation

```javascript
// Create a trait with standard properties
const trait = this.createTrait({
    measurement: 450.5,
    type: "peakWavelength",
    unit: "nm",
    equipment: "spectrometer",
    notes: "Optional notes about the measurement"
}, experimentData);
```

### Experiment Updates

```javascript
// Create experiment update object
const updates = this.createExperimentUpdate(
    { peakWavelength: 450.5, processed: true },
    "Added peak wavelength automatically"
);
```


## Parser Properties

### Required Properties

```javascript
constructor() {
    super();
    this.name = 'MyExperimentParser'; // Parser class name
    this.label = 'My Experiment'; // Human-readable label for UI
    this.supportedTypes = ['my_experiment_type']; // Array of supported types
    this.version = '1.0.0'; // Parser version
    this.description = 'Processes my specific experiment type data';
    this.requiredFields = ['MyRequiredField1']; // Required data fields
    this.generatedTraits = [ // Traits this parser will generate
        { name: 'myMeasurement', unit: 'units', description: 'Description of measurement' }
    ];
}
```

### Optional Properties

```javascript
constructor() {
    super();
    // ...required properties...
    this.author = 'Your Name';
    this.optionalFields = ['OptionalField1', 'OptionalField2'];
}
```

## Data Structure

### Input Data Structure

Your parser receives:

```javascript
experimentData = {
    name: "My Experiment",
    type: "my_experiment_type",
    sampleId: "sample_id",
    responsible: "user_id",
    date: "2024-01-01T00:00:00.000Z",
    notes: "Optional notes",
    // ... other experiment fields
}

fileData = {
    includedData: {
        // Raw measurement data
        MyDataField1: [1, 2, 3, 4, 5],
        MyDataField2: [10, 20, 30, 40, 50],
        // ... other data fields
    },
    metadata: [
        { key: "temperature", value: "25°C" },
        { key: "humidity", value: "45%" }
    ]
}

context = {
    db: mongoDbInstance,
    collections: {
        experiments: experimentsCollection,
        traits: traitsCollection,
        samples: samplesCollection,
        rawdata: rawdataCollection
    }
}
```

### Output Data Structure

Your parser should return:

```javascript
{
    success: true,
    traits: [
        {
            measurement: 450.5,
            type: "peakWavelength",
            unit: "nm",
            equipment: "spectrometer",
            // ... other trait properties added automatically
        }
    ],
    experimentUpdates: {
        peakWavelength: 450.5,
        processed: true
    },
    logMessage: "Processed spectroscopy data - extracted 1 traits"
}
```

## Examples

### Simple Measurement Extraction

```javascript
extractTemperature(fileData) {
    if (!fileData.includedData || !fileData.includedData.Temperature) {
        return null;
    }
    
    return this.extractValue(fileData.includedData.Temperature, 'avg');
}
```

### Calculation

```javascript
calculateRatio(fileData) {
    const { Signal1, Signal2 } = fileData.includedData;
    
    if (!Signal1 || !Signal2 || Signal1.length !== Signal2.length) {
        return null;
    }
    
    const ratios = Signal1.map((val, idx) => val / Signal2[idx]);
    return this.extractValue(ratios, 'avg');
}
```

### Multiple Traits from One Dataset

```javascript
async process(experimentData, fileData, context) {
    // ... validation code ...
    
    const traits = [];
    
    // Extract multiple measurements
    const measurements = [
        { value: this.extractPeakIntensity(fileData), type: 'peakIntensity', unit: 'counts' },
        { value: this.extractPeakWidth(fileData), type: 'peakWidth', unit: 'nm' },
        { value: this.extractBaseline(fileData), type: 'baseline', unit: 'counts' }
    ];
    
    for (const measurement of measurements) {
        if (measurement.value !== null) {
            const trait = this.createTrait({
                measurement: measurement.value,
                type: measurement.type,
                unit: measurement.unit,
                equipment: "spectrometer",
            }, experimentData);
            
            traits.push(trait);
        }
    }
    
    return { success: true, traits, experimentUpdates: {}, logMessage: `Extracted ${traits.length} traits` };
}
```

## Error Handling

### Validation Errors

```javascript
validate(experimentData, fileData) {
    const baseValidation = super.validate(experimentData, fileData);
    if (!baseValidation.success) {
        return baseValidation;
    }

    const errors = [];
    
    // Check specific requirements
    if (!fileData.includedData?.MyRequiredField) {
        errors.push('MyRequiredField is required for this experiment type');
    }
    
    if (fileData.includedData?.MyField?.length < 10) {
        errors.push('MyField must have at least 10 data points');
    }

    return {
        success: errors.length === 0,
        errors: [...baseValidation.errors, ...errors]
    };
}
```

### Processing Errors

```javascript
try {
    const result = this.complexCalculation(fileData);
    // ... process result ...
} catch (error) {
    this.log(`Calculation failed: ${error.message}`, 'error');
    return {
        success: false,
        error: `Calculation failed: ${error.message}`,
        traits: [],
        experimentUpdates: {},
    };
}
```

## Testing Your Parser

Every parser should have comprehensive tests to ensure reliability and correctness. The testing framework is set up to validate the functionality of your parser against various scenarios.

### Test Files Structure

```text
src/utils/experiment-parsers/__tests__/
├── test-data/      # Sample test data
testing
├── test-helpers.js                    # Utility functions for testing
├── setup.js                          # Test configuration
└── YourParser.test.js                 # Your parser tests
```

### Writing Parser Tests

Create a test file for your parser following the templates found in `src/utils/experiment-parsers/__tests__`. Use the provided test data to validate your parser's functionality.

### Running Tests

```bash
# Run your parser tests
npm test -- src/utils/experiment-parsers/__tests__/MyExperimentParser.test.js

# Run all parser tests
npm test -- src/utils/experiment-parsers/__tests__

# Run with coverage
npm test -- --coverage src/utils/experiment-parsers/__tests__

# Run specific test pattern
npm test -- --testNamePattern="should process data successfully"
```

---

For more examples, see the existing parsers in `src/utils/experiment-parsers/`.
