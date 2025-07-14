import { describe, expect, jest, test } from '@jest/globals';
import { ObjectId } from 'mongodb';
import { DELETE } from '@/app/api/traits/route'; // adjust path as needed

// Mock the MongoDB client and utilities
jest.mock('@/app/api/utils/mongodbClient', () => ({
  get_or_create_client: jest.fn(),
}));

jest.mock('@/app/api/utils/get_database_user', () => ({
  get_database_user: jest.fn().mockResolvedValue('testdb'),
}));

describe('Trait DELETE Operation', () => {
  let mockCollection;
  let mockDb;
  let mockClient;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup mock collection with basic methods
    mockCollection = {
      deleteOne: jest.fn(),
    };

    // Setup mock db
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    // Setup mock client
    mockClient = {
      db: jest.fn().mockReturnValue(mockDb),
    };

    // Set the mock implementation for get_or_create_client
    const { get_or_create_client } = require('@/app/api/utils/mongodbClient');
    get_or_create_client.mockResolvedValue(mockClient);
  });

  // TODO - the mongo operation is mocked. It would be cool to test the POST, and then test the DELETE on the same entry

  test('successfully deletes a trait', async () => {
    // Setup
    const traitId = new ObjectId().toString();
    mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

    // Create mock request
    const request = new Request('http://localhost/api/traits', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: traitId }),
    });

    // Execute
    const response = await DELETE(request);
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseData.message).toBe('Trait deleted successfully');
    expect(mockCollection.deleteOne).toHaveBeenCalledWith({ 
      _id: expect.any(ObjectId) 
    });
  });

  test('returns 404 when trait not found', async () => {
    // Setup - simulate no trait found
    const traitId = new ObjectId().toString();
    mockCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 0 });

    // Execute
    const response = await DELETE(new Request('http://localhost/api/traits', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: traitId }),
    }));
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(responseData.error).toBe('Trait not found or already deleted');
  });

  test('handles database connection failure', async () => {
    // Setup - simulate database connection failure
    const { get_or_create_client } = require('@/app/api/utils/mongodbClient');
    get_or_create_client.mockResolvedValueOnce(null);

    // Execute
    const response = await DELETE(new Request('http://localhost/api/traits', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: new ObjectId().toString() }),
    }));
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(responseData.error).toBe('Failed to connect to database');
  });

  test('handles invalid ObjectId format', async () => {
    // Execute with invalid ID
    const response = await DELETE(new Request('http://localhost/api/traits', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: 'invalid-id' }),
    }));
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(responseData.error).toBeDefined();
  });
});