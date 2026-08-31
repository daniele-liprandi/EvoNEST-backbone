/** @jest-environment node */

import { POST } from '@/app/api/ai/chat/route'

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/app/api/auth/[...nextauth]/options', () => ({
  authOptions: {},
}))

jest.mock('@/app/api/utils/get_database_user', () => ({
  get_database_user: jest.fn(),
}))

const { getServerSession } = require('next-auth')
const { get_database_user } = require('@/app/api/utils/get_database_user')

describe('POST /api/ai/chat', () => {
  beforeEach(() => jest.clearAllMocks())

  test('returns 401 when not authenticated', async () => {
    getServerSession.mockResolvedValue(null)
    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello', threadId: 'test-thread' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(401)
  })

  test('returns 400 when message is missing', async () => {
    getServerSession.mockResolvedValue({ user: { name: 'alice' } })
    get_database_user.mockResolvedValue('testdb')
    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: 'test-thread' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })

  test('forwards the request to the mastra service with the service key', async () => {
    getServerSession.mockResolvedValue({ user: { name: 'alice' } })
    get_database_user.mockResolvedValue('testdb')
    process.env.MASTRA_SERVICE_SECRET = 'secret-123'
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ blocks: [] }), { status: 200 }))

    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello', threadId: 'test-thread' }),
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    const [, init] = fetchMock.mock.calls[0]
    expect((init?.headers as Record<string, string>)['x-service-key']).toBe('secret-123')
    fetchMock.mockRestore()
  })

  test('returns 503 when the service secret is not configured', async () => {
    getServerSession.mockResolvedValue({ user: { name: 'alice' } })
    get_database_user.mockResolvedValue('testdb')
    delete process.env.MASTRA_SERVICE_SECRET
    const req = new Request('http://localhost/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'hello', threadId: 'test-thread' }),
    })
    const res = await POST(req as any)
    expect(res.status).toBe(503)
  })
})