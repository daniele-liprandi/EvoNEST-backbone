/** @jest-environment node */

const os = require('os');
const realFs = require('fs');
const nodePath = require('path');

const STORAGE_ROOT = realFs.mkdtempSync(nodePath.join(os.tmpdir(), 'evonest-storage-'));
process.env.STORAGE_PATH = STORAGE_ROOT;

jest.mock('@/app/api/utils/mongodbClient', () => ({ get_or_create_client: jest.fn() }));
jest.mock('@/app/api/utils/get_database_user', () => ({
  get_database_user: jest.fn().mockResolvedValue('testdb'),
}));

const { get_or_create_client } = require('@/app/api/utils/mongodbClient');
const { GET } = require('@/app/api/download/route');

const VALID_ID = '507f1f77bcf86cd799439011';

function mockFileDoc(doc) {
  get_or_create_client.mockResolvedValue({
    db: () => ({ collection: () => ({ findOne: jest.fn().mockResolvedValue(doc) }) }),
  });
}

const request = (id = VALID_ID) => new Request(`http://localhost/api/download?id=${id}`);

afterAll(() => realFs.rmSync(STORAGE_ROOT, { recursive: true, force: true }));

describe('GET /api/download path containment', () => {
  beforeEach(() => jest.clearAllMocks());

  test('serves a file inside the storage root', async () => {
    const filePath = nodePath.join(STORAGE_ROOT, 'testdb', 'animal', 'sample', '1', 'data.csv');
    realFs.mkdirSync(nodePath.dirname(filePath), { recursive: true });
    realFs.writeFileSync(filePath, 'col1,col2\n1,2\n');
    mockFileDoc({ _id: VALID_ID, name: 'data.csv', path: filePath });

    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('col1,col2');
  });

  test.each([
    ['absolute path outside root', '/etc/passwd'],
    ['traversal out of root', `${STORAGE_ROOT}/../etc/passwd`],
    ['sibling directory sharing a prefix', `${STORAGE_ROOT}-other/secret`],
  ])('rejects %s with 403', async (_label, badPath) => {
    mockFileDoc({ _id: VALID_ID, name: 'x', path: badPath });
    const res = await GET(request());
    expect(res.status).toBe(403);
  });

  test('rejects a non-string path', async () => {
    mockFileDoc({ _id: VALID_ID, name: 'x', path: null });
    const res = await GET(request());
    expect(res.status).toBe(403);
  });
});
