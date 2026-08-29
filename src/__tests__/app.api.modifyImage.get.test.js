/** @jest-environment node */

jest.mock('sharp', () => {
  const chain = {
    metadata: jest.fn().mockResolvedValue({ width: 200, height: 200 }),
    extend: jest.fn(() => chain),
    composite: jest.fn(() => chain),
    png: jest.fn(() => chain),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('png')),
  };
  return jest.fn(() => chain);
});

const { GET } = require('@/app/api/modifyImage/route');

const okImageResponse = () =>
  new Response(Buffer.from('img'), { status: 200, headers: { 'content-type': 'image/png' } });

const call = (qrcodeurl, extra = '') =>
  GET(new Request(`http://localhost/api/modifyImage?qrcodeurl=${encodeURIComponent(qrcodeurl)}${extra}`));

describe('GET /api/modifyImage URL validation', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(okImageResponse());
  });
  afterEach(() => jest.clearAllMocks());

  test('fetches from an allowed host', async () => {
    const res = await call('https://barcodeapi.org/api/qr/ABC');
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['a disallowed host', 'https://evil.example.com/x.png'],
    ['an internal address', 'https://169.254.169.254/latest/meta-data/'],
    ['a non-https scheme', 'http://barcodeapi.org/api/qr/ABC'],
    ['a file scheme', 'file:///etc/passwd'],
    ['a non-URL', 'not-a-url'],
  ])('rejects %s with 400 and never fetches', async (_label, url) => {
    const res = await call(url);
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('propagates a failure as 500 when the download errors', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('aborted'));
    const res = await call('https://barcodeapi.org/api/qr/ABC');
    expect(res.status).toBe(500);
  });

  test('rejects an oversized image', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(Buffer.from('img'), {
        status: 200,
        headers: { 'content-type': 'image/png', 'content-length': String(10 * 1024 * 1024) },
      })
    );
    const res = await call('https://barcodeapi.org/api/qr/ABC');
    expect(res.status).toBe(500);
  });
});
