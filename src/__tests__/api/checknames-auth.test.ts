/** @jest-environment node */

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/app/api/auth/[...nextauth]/options', () => ({ authOptions: {} }))
jest.mock('@/app/api/utils/mongodbClient', () => ({ get_or_create_client: jest.fn() }))

const { getServerSession } = require('next-auth')
import { POST } from '@/app/api/checknames/route'

describe('POST /api/checknames auth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.MASTRA_SERVICE_SECRET
  })

  test('401 without a session or service key', async () => {
    getServerSession.mockResolvedValue(null)
    const req = new Request('http://localhost/api/checknames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxa: 'Araneus diadematus' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  test('a wrong service key is rejected', async () => {
    getServerSession.mockResolvedValue(null)
    process.env.MASTRA_SERVICE_SECRET = 'right'
    const req = new Request('http://localhost/api/checknames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-service-key': 'wrong' },
      body: JSON.stringify({ taxa: 'Araneus diadematus' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })
})
