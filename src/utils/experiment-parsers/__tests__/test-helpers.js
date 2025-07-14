/**
 * Test Helpers
 * 
 * Utility functions and shared test data for parser tests
 */

export const createMockExperimentData = (overrides = {}) => ({
    name: 'Test Experiment',
    type: 'mechanical_test',
    sampleId: '64f8a1b2c3d4e5f6a7b8c9d0',
    responsible: '64f8a1b2c3d4e5f6a7b8c9d1',
    date: '2024-01-15T10:30:00.000Z',
    notes: 'Test experiment data',
    ...overrides
});

export const createMockFileData = (overrides = {}) => ({
    includedData: {
        LoadOnSpecimen: [0, 25, 50, 75, 100, 75, 50, 25, 0],
        DisplacementOnSpecimen: [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0],
        Time: [0, 1, 2, 3, 4, 5, 6, 7, 8]
    },
    metadata: [
        { key: 'temperature', value: '23°C' },
        { key: 'humidity', value: '45%' }
    ],
    ...overrides
});

export const createMockImageData = (overrides = {}) => ({
    includedData: {
        AreaMeasurements: [100, 101, 99, 102, 98],
        PerimeterMeasurements: [35, 36, 34, 37, 33],
        ColorData: {
            RGB: { R: 255, G: 128, B: 64 },
            HSV: { H: 30, S: 75, V: 100 }
        }
    },
    metadata: [
        { key: 'magnification', value: '100x' },
        { key: 'pixel_size', value: '0.065μm' }
    ],
    ...overrides
});

export const createMockContext = () => ({
    db: {
        collection: jest.fn(() => ({
            insertOne: jest.fn().mockResolvedValue({ insertedId: 'mock-id' }),
            updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
            findOne: jest.fn().mockResolvedValue(null)
        }))
    },
    collections: {
        experiments: {
            insertOne: jest.fn().mockResolvedValue({ insertedId: 'exp-id' }),
            updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
        },
        traits: {
            insertOne: jest.fn().mockResolvedValue({ insertedId: 'trait-id' }),
            findOne: jest.fn().mockResolvedValue(null)
        },
        samples: {
            updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
        },
        rawdata: {
            insertOne: jest.fn().mockResolvedValue({ insertedId: 'raw-id' })
        }
    }
});

export const validateTraitStructure = (trait) => {
    const requiredFields = [
        'method', 'responsible', 'sampleId', 'experimentId',
        'measurement', 'type', 'unit', 'date', 'recentChangeDate', 'logbook'
    ];

    requiredFields.forEach(field => {
        expect(trait).toHaveProperty(field);
        expect(trait[field]).toBeDefined();
    });

    expect(trait.method).toBe('create');
    expect(typeof trait.measurement).toBe('number');
    expect(typeof trait.type).toBe('string');
    expect(typeof trait.unit).toBe('string');
    expect(Array.isArray(trait.logbook)).toBe(true);
};

export const validateExperimentUpdate = (update) => {
    expect(update).toHaveProperty('$set');
    expect(update).toHaveProperty('$push');
    expect(update.$set).toHaveProperty('recentChangeDate');
    expect(update.$push).toHaveProperty('logbook');
    expect(Array.isArray(update.$push.logbook)).toBe(true);
    expect(update.$push.logbook).toHaveLength(2); // [timestamp, message]
};

export const measureExecutionTime = async (asyncFunction) => {
    const startTime = process.hrtime.bigint();
    const result = await asyncFunction();
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    return { result, executionTime };
};

// Test data generators for stress testing
export const generateLargeDataset = (size = 10000) => ({
    includedData: {
        LoadOnSpecimen: Array.from({ length: size }, (_, i) => 
            Math.sin(i / (size / 20)) * 100 + Math.random() * 10
        ),
        DisplacementOnSpecimen: Array.from({ length: size }, (_, i) => 
            i * (5 / size) + Math.random() * 0.1
        ),
        Time: Array.from({ length: size }, (_, i) => i * (10 / size))
    },
    metadata: [
        { key: 'dataset_size', value: size.toString() },
        { key: 'test_type', value: 'stress_test' }
    ]
});

export const generateImageDataset = (numMeasurements = 100) => ({
    includedData: {
        AreaMeasurements: Array.from({ length: numMeasurements }, () => 
            100 + Math.random() * 20 - 10
        ),
        PerimeterMeasurements: Array.from({ length: numMeasurements }, () => 
            35 + Math.random() * 5 - 2.5
        ),
        ColorData: {
            RGB: {
                R: Math.floor(Math.random() * 256),
                G: Math.floor(Math.random() * 256),
                B: Math.floor(Math.random() * 256)
            },
            HSV: {
                H: Math.floor(Math.random() * 360),
                S: Math.floor(Math.random() * 101),
                V: Math.floor(Math.random() * 101)
            }
        }
    },
    metadata: [
        { key: 'num_measurements', value: numMeasurements.toString() },
        { key: 'test_type', value: 'batch_analysis' }
    ]
});

// Assertion helpers
export const assertTraitType = (traits, expectedType, expectedCount = 1) => {
    const traitsOfType = traits.filter(t => t.type === expectedType);
    expect(traitsOfType).toHaveLength(expectedCount);
    return traitsOfType[0];
};

export const assertTraitValue = (trait, expectedValue, tolerance = 0.001) => {
    if (typeof expectedValue === 'number') {
        expect(trait.measurement).toBeCloseTo(expectedValue, Math.ceil(-Math.log10(tolerance)));
    } else {
        expect(trait.measurement).toBe(expectedValue);
    }
};

export const assertProcessingResult = (result, expectSuccess = true) => {
    if (expectSuccess) {
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.traits).toBeDefined();
        expect(result.experimentUpdates).toBeDefined();
        expect(result.logMessage).toBeDefined();
    } else {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.traits).toEqual([]);
        expect(result.experimentUpdates).toEqual({});
    }
};
