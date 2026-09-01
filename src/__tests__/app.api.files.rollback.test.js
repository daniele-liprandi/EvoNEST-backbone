/** @jest-environment node */

process.env.STORAGE_PATH = '/storage';

jest.mock('@/app/api/utils/mongodbClient', () => ({ get_or_create_client: jest.fn() }));
jest.mock('@/app/api/utils/get_database_user', () => ({ get_database_user: jest.fn() }));

const fs = require('fs');
const { rollbackUpload } = require('@/app/api/files/rollback');

describe('rollbackUpload', () => {
  let unlinkSpy;
  let errSpy;

  beforeEach(() => {
    unlinkSpy = jest.spyOn(fs.promises, 'unlink');
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test('removes both the file and the document', async () => {
    unlinkSpy.mockResolvedValue(undefined);
    const deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });

    await rollbackUpload('/storage/db/x/1/f.csv', 'fid', { deleteOne });

    expect(unlinkSpy).toHaveBeenCalledWith('/storage/db/x/1/f.csv');
    expect(deleteOne).toHaveBeenCalledWith({ _id: 'fid' });
    expect(errSpy).not.toHaveBeenCalled();
  });

  test('still deletes the document when the unlink fails, and logs both outcomes', async () => {
    unlinkSpy.mockRejectedValue(new Error('ENOENT'));
    const deleteOne = jest.fn().mockRejectedValue(new Error('db down'));

    await expect(
      rollbackUpload('/storage/db/x/1/f.csv', 'fid', { deleteOne })
    ).resolves.toBeUndefined();

    expect(deleteOne).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledTimes(2);
  });
});
