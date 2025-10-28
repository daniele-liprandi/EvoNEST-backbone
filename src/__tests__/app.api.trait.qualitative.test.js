import { describe, expect, jest, test, beforeEach } from '@jest/globals';
import { ObjectId } from 'mongodb';
import { POST } from '@/app/api/traits/route';

// Mock the MongoDB client and utilities
jest.mock('@/app/api/utils/mongodbClient', () => ({
  get_or_create_client: jest.fn(),
}));

jest.mock('@/app/api/utils/get_database_user', () => ({
  get_database_user: jest.fn().mockResolvedValue('testdb'),
  get_name_authuser: jest.fn().mockResolvedValue('testuser'),
}));

describe('Qualitative Trait Creation Tests', () => {
  let mockCollection;
  let mockDb;
  let mockClient;
  let mockSamplesCollection;
  let mockUsersCollection;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup mock collections
    mockCollection = {
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      findOne: jest.fn(),
    };

    mockSamplesCollection = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };

    mockUsersCollection = {
      findOne: jest.fn(),
    };

    // Setup mock db
    mockDb = {
      collection: jest.fn((name) => {
        if (name === 'traits') return mockCollection;
        if (name === 'samples') return mockSamplesCollection;
        if (name === 'users') return mockUsersCollection;
        return mockCollection;
      }),
    };

    // Setup mock client with usersdb
    mockClient = {
      db: jest.fn((dbName) => {
        if (dbName === 'usersdb') {
          return { collection: () => mockUsersCollection };
        }
        return mockDb;
      }),
    };

    // Set the mock implementation for get_or_create_client
    const { get_or_create_client } = require('@/app/api/utils/mongodbClient');
    get_or_create_client.mockResolvedValue(mockClient);

    // Setup default successful responses
    const sampleId = new ObjectId();
    const userId = new ObjectId();

    mockSamplesCollection.findOne.mockResolvedValue({ _id: sampleId, name: 'Test Sample' });
    mockSamplesCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
    mockUsersCollection.findOne.mockResolvedValue({ _id: userId, name: 'Test User' });
    mockCollection.insertOne.mockResolvedValue({ insertedCount: 1, insertedId: new ObjectId() });
  });

  describe('Categorical Traits', () => {
    test('successfully creates a categorical trait', async () => {
      const sampleId = new ObjectId().toString();
      const userId = new ObjectId().toString();

      const request = new Request('http://localhost/api/traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'create',
          type: 'sex',
          sampleId: sampleId,
          responsible: userId,
          date: '2024-03-15',
          categoricalValue: 'male',
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sex',
          categoricalValue: 'male',
        })
      );
    });

    test('rejects categorical trait without categoricalValue', async () => {
      const sampleId = new ObjectId().toString();
      const userId = new ObjectId().toString();

      const request = new Request('http://localhost/api/traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'create',
          type: 'sex',
          sampleId: sampleId,
          responsible: userId,
          date: '2024-03-15',
          // Missing categoricalValue
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('categorical traits require a categoricalValue');
    });
  });

  describe('Boolean Traits', () => {
    test('successfully creates a boolean trait', async () => {
      const sampleId = new ObjectId().toString();
      const userId = new ObjectId().toString();

      const request = new Request('http://localhost/api/traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'create',
          type: 'has_wings',
          sampleId: sampleId,
          responsible: userId,
          date: '2024-03-15',
          categoricalValue: 'yes',
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'has_wings',
          categoricalValue: 'yes',
        })
      );
    });
  });

  describe('Ordinal Traits', () => {
    test('successfully creates an ordinal trait within valid range', async () => {
      const sampleId = new ObjectId().toString();
      const userId = new ObjectId().toString();

      const request = new Request('http://localhost/api/traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'create',
          type: 'condition_score',
          sampleId: sampleId,
          responsible: userId,
          date: '2024-03-15',
          categoricalValue: '4',
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });

    test('rejects ordinal trait outside valid range', async () => {
      const sampleId = new ObjectId().toString();
      const userId = new ObjectId().toString();

      const request = new Request('http://localhost/api/traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'create',
          type: 'condition_score',
          sampleId: sampleId,
          responsible: userId,
          date: '2024-03-15',
          categoricalValue: '10', // Out of range (1-5)
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('must be between');
    });
  });

  describe('Multi-select Traits', () => {
    test('successfully creates a multi-select trait', async () => {
      const sampleId = new ObjectId().toString();
      const userId = new ObjectId().toString();

      const request = new Request('http://localhost/api/traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'create',
          type: 'body_markings',
          sampleId: sampleId,
          responsible: userId,
          date: '2024-03-15',
          categoricalValues: ['stripes', 'spots'],
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'body_markings',
          categoricalValues: ['stripes', 'spots'],
        })
      );
    });

    test('rejects multi-select trait with empty array', async () => {
      const sampleId = new ObjectId().toString();
      const userId = new ObjectId().toString();

      const request = new Request('http://localhost/api/traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'create',
          type: 'body_markings',
          sampleId: sampleId,
          responsible: userId,
          date: '2024-03-15',
          categoricalValues: [],
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('at least one value');
    });
  });

  describe('Backward Compatibility - Quantitative Traits', () => {
    test('successfully creates a quantitative trait (legacy behavior)', async () => {
      const sampleId = new ObjectId().toString();
      const userId = new ObjectId().toString();

      const request = new Request('http://localhost/api/traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'create',
          type: 'mass',
          sampleId: sampleId,
          responsible: userId,
          date: '2024-03-15',
          measurement: 2.5,
          unit: 'g',
          std: 0.3,
          listvals: [2.3, 2.5, 2.7],
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mass',
          measurement: 2.5,
          unit: 'g',
          std: 0.3,
          listvals: [2.3, 2.5, 2.7],
        })
      );
    });

    test('defaults to quantitative for unknown trait types (backward compatibility)', async () => {
      const sampleId = new ObjectId().toString();
      const userId = new ObjectId().toString();

      const request = new Request('http://localhost/api/traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'create',
          type: 'custom_trait_type', // Not in default config
          sampleId: sampleId,
          responsible: userId,
          date: '2024-03-15',
          measurement: 100,
          unit: 'custom_unit',
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
    });
  });
});
