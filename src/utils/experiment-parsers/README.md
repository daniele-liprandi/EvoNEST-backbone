# Experiment Parsers

This directory contains the modular experiment parser system for EvoNEST.

## Files Overview

- **`registry.js`** - Main registry that maps experiment types to parsers
- **`BaseExperimentParser.js`** - Base class that all parsers extend
- **`MechanicalTestParser.js`** - Parser for mechanical testing experiments
- **`ImageAnalysisParser.js`** - Parser for image analysis experiments
- **`TemplateExperimentParser.js`** - Template for creating new parsers
- **`index.js`** - Main export file for the module

## Quick Start

1. Copy `TemplateExperimentParser.js` to create a new parser
2. Implement the `process()` method
3. Register your parser in `registry.js`
4. Test with your experiment type

## Creating a New Parser

```javascript
import { BaseExperimentParser } from './BaseExperimentParser.js';

export class MyParser extends BaseExperimentParser {
    constructor() {
        super();
        this.supportedTypes = ['my_experiment_type'];
    }

    async process(experimentData, fileData, context) {
        // Your processing logic here
        return {
            success: true,
            traits: [],
            experimentUpdates: {},
            logMessage: "Processing complete"
        };
    }
}
```

Then register it:

```javascript
// In registry.js
import { MyParser } from './MyParser';

export const EXPERIMENT_PARSERS = {
    // ...existing parsers...
    'my_experiment_type': MyParser,
};
```

## Testing

The parser system includes comprehensive tests to ensure reliability and help with development.

### Running Tests

```bash
# Run all parser tests
npm test -- src/utils/experiment-parsers/__tests__

# Run specific test file
npm test -- src/utils/experiment-parsers/__tests__/MechanicalTestParser.test.js

# Run tests with coverage
npm test -- --coverage src/utils/experiment-parsers/__tests__

# Run integration tests only
npm test -- src/utils/experiment-parsers/__tests__/integration.test.js
```

### Test Structure

- **`BaseExperimentParser.test.js`** - Tests for base parser functionality
- **`MechanicalTestParser.test.js`** - Tests for mechanical test parsing
- **`ImageAnalysisParser.test.js`** - Tests for image analysis parsing
- **`registry.test.js`** - Tests for parser registry system
- **`integration.test.js`** - End-to-end integration tests
- **`test-data/`** - Sample data files for testing
- **`test-helpers.js`** - Utility functions for tests

### Test Data

The `test-data/` directory contains realistic sample data:

- **`mechanical-test-data.json`** - Tensile test data with load and displacement
- **`image-analysis-data.json`** - Morphometric and color analysis data
- **`spectroscopy-data.json`** - Spectroscopy data (for future parser)
- **`invalid-data.json`** - Invalid data for error testing

### Writing Tests for Your Parser

When creating a new parser, add tests following this pattern:

```javascript
import { MyParser } from '../MyParser.js';
import { createMockExperimentData, createMockContext } from './test-helpers.js';

describe('MyParser', () => {
    let parser;

    beforeEach(() => {
        parser = new MyParser();
    });

    test('should process data correctly', async () => {
        const experimentData = createMockExperimentData();
        const fileData = { includedData: { MyData: [1, 2, 3] } };
        const context = createMockContext();

        const result = await parser.process(experimentData, fileData, context);

        expect(result.success).toBe(true);
        expect(result.traits.length).toBeGreaterThan(0);
    });
});
```

## Architecture

```text
Experiment Submission
        ↓
    Registry checks for parser
        ↓
    Parser processes data
        ↓
    Traits & updates generated
        ↓
    Database updated
```

The system is designed to be:

- **Modular**: Each parser handles specific experiment types
- **Extensible**: Easy to add new parsers
- **Robust**: Graceful error handling
- **Consistent**: Standard interface for all parsers
