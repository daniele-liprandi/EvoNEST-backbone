// fileHandler.test.ts
import { uploadFile, uploadFiles, linkFileToEntry, type EntryType } from '@/utils/handlers/fileHandlers';
import { toast } from 'sonner';

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
  },
}));

// Mock prepend_path
jest.mock('@/lib/utils', () => ({
  prepend_path: '',
}));

describe('fileHandler', () => {
  // Setup before each test
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  // Utility function to create a mock file
  const createMockFile = (name: string, type: string, size: number): File => {
    const file = new File([''], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  };

  describe('uploadFile', () => {
    it('should successfully upload a single file', async () => {
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ fileId: '123' }),
      });

      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
      const metadata = {
        entryType: 'sample' as EntryType,
        entryId: '456',
      };

      const result = await uploadFile(mockFile, 'images', metadata);

      // Assert fetch was called correctly
      expect(global.fetch).toHaveBeenCalledWith('/api/files', {
        method: 'POST',
        body: expect.any(FormData),
      });

      // Check the FormData content
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const formData = fetchCall[1].body as FormData;
      expect(formData.get('file')).toBeTruthy();
      expect(formData.get('type')).toBe('images');
      expect(JSON.parse(formData.get('metadata') as string)).toEqual(metadata);

      // Assert results
      expect(result).toBe('123');
      expect(toast.success).toHaveBeenCalledWith('File uploaded successfully');
    });

    it('should handle upload failure', async () => {
      // Mock failed response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Upload failed' }),
      });

      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
      const metadata = {
        entryType: 'sample' as EntryType,
        entryId: '456',
      };

      const result = await uploadFile(mockFile, 'images', metadata);

      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Failed to upload file');
    });

    it('should handle network errors', async () => {
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const mockFile = createMockFile('test.jpg', 'image/jpeg', 1024);
      const metadata = {
        entryType: 'sample' as EntryType,
        entryId: '456',
      };

      const result = await uploadFile(mockFile, 'images', metadata);

      expect(result).toBeNull();
      expect(toast.error).toHaveBeenCalledWith('Failed to upload file');
    });
  });

  describe('uploadFiles', () => {
    it('should handle multiple successful uploads', async () => {
      // Mock successful responses for multiple files
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ fileId: '123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ fileId: '456' }),
        });

      const mockFiles = [
        createMockFile('test1.jpg', 'image/jpeg', 1024),
        createMockFile('test2.jpg', 'image/jpeg', 1024),
      ] as unknown as FileList;

      const metadata = {
        entryType: 'sample' as EntryType,
        entryId: '789',
      };

      const results = await uploadFiles(mockFiles, 'images', metadata);

      expect(results).toEqual(['123', '456']);
      expect(toast.success).toHaveBeenCalledWith('All 2 files uploaded successfully');
    });

    it('should handle partial upload failures', async () => {
      // Mock mixed responses
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ fileId: '123' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Upload failed' }),
        });

      const mockFiles = [
        createMockFile('test1.jpg', 'image/jpeg', 1024),
        createMockFile('test2.jpg', 'image/jpeg', 1024),
      ] as unknown as FileList;

      const metadata = {
        entryType: 'sample' as EntryType,
        entryId: '789',
      };

      const results = await uploadFiles(mockFiles, 'images', metadata);

      expect(results).toEqual(['123', null]);
      expect(toast.warning).toHaveBeenCalledWith('1 of 2 files uploaded successfully');
    });
  });

  describe('linkFileToEntry', () => {
    it('should successfully link a file to an entry', async () => {
      // Mock successful response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await linkFileToEntry('123', 'sample', '456');

      expect(global.fetch).toHaveBeenCalledWith('/api/files/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId: '123',
          entryType: 'sample',
          entryId: '456',
        }),
      });

      expect(result).toBe(true);
    });

    it('should handle linking failure', async () => {
      // Mock failed response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Linking failed' }),
      });

      const result = await linkFileToEntry('123', 'sample', '456');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Failed to link file');
    });

    it('should handle network errors during linking', async () => {
      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await linkFileToEntry('123', 'sample', '456');

      expect(result).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Failed to link file');
    });
  });
});