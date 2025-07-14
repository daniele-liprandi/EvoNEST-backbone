import { POST } from '@/app/api/files/route';
import { ObjectId } from 'mongodb';

// Mock the MongoDB client and database utilities
jest.mock('@/app/api/utils/mongodbClient', () => ({
  get_or_create_client: jest.fn(),
}));

// Mock the database user utility
jest.mock('@/app/api/utils/get_database_user', () => ({
  get_database_user: jest.fn().mockResolvedValue('testdb'),
}));

// Mock filesystem operations
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  access: jest.fn().mockRejectedValue(new Error('Directory does not exist')), // Mock access to fail so mkdir gets called
}));

// Mock fs for the ensureDirectoryExists function
jest.mock('fs', () => ({
  promises: {
    access: jest.fn().mockRejectedValue(new Error('Directory does not exist')), // Mock access to fail so mkdir gets called
    mkdir: jest.fn().mockResolvedValue(undefined),
  }
}));

// Mock path utilities
jest.mock('path', () => ({
  join: (...args) => args.join('/'),
  dirname: (path) => path.split('/').slice(0, -1).join('/'),
}));

// Set storage path environment variable
process.env.STORAGE_PATH = '/storage';

describe('Files API POST endpoint - Basic Operations', () => {
  let mockCollection;
  let mockDb;
  let mockClient;
  let fsPromises;
  let fs;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get reference to mocked modules
    fsPromises = require('fs/promises');
    fs = require('fs');

    // Setup mock collection
    mockCollection = {
      insertOne: jest.fn().mockResolvedValue({ insertedId: new ObjectId() }),
      findOne: jest.fn().mockResolvedValue({ _id: new ObjectId() }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    // Setup mock db
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection),
    };

    // Setup mock client
    mockClient = {
      db: jest.fn().mockReturnValue(mockDb),
    };

    // Setup database client connection
    const { get_or_create_client } = require('@/app/api/utils/mongodbClient');
    get_or_create_client.mockResolvedValue(mockClient);
  });

  it('should handle successful file upload with direct linking', async () => {
    // Create mock file
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const formData = new FormData();
    const mockEntryId = new ObjectId().toString();
    
    // Setup form data
    formData.append('file', file);
    formData.append('type', 'documents');
    formData.append('metadata', JSON.stringify({
        entryType: 'sample',
        entryId: mockEntryId,
    }));

    // Send request
    const response = await POST(new Request('http://localhost', {
        method: 'POST',
        body: formData,
    }));

    // Verify response
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result).toHaveProperty('fileId');
    
    // Verify filesystem operations
    expect(fs.promises.access).toHaveBeenCalled(); // Should be called to check directory
    expect(fs.promises.mkdir).toHaveBeenCalledWith(
        expect.stringContaining(`/testdb/documents/sample/${mockEntryId}`),
        expect.objectContaining({ recursive: true })
    );
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(`/testdb/documents/sample/${mockEntryId}/test.txt`),
        expect.any(Buffer)
    );
    
    // Verify database operations
    expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
    expect(mockCollection.updateOne).toHaveBeenCalledTimes(1);
  });

  it('should handle missing file', async () => {
    const formData = new FormData();
    
    const response = await POST(new Request('http://localhost', {
      method: 'POST',
      body: formData,
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'No files received.' });
    
    // Verify no operations occurred
    expect(mockCollection.insertOne).not.toHaveBeenCalled();
    expect(fsPromises.writeFile).not.toHaveBeenCalled();
    expect(fsPromises.mkdir).not.toHaveBeenCalled();
  });
});