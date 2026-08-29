/** @jest-environment node */

import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  test('returns 200 with status ok and no auth', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: 'ok' });
  });
});
